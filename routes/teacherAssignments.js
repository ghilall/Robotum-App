import pool from '../database_manage.js';

// Create teacher-course assignment
export const createTeacherAssignment = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler öğretmen atayabilir.' });
  }

  const { teacherId, courseId, assignmentDate, role } = req.body;

  if (!teacherId || !courseId || !assignmentDate || !role) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
  }

  // Validate role
  const validRoles = ['Asıl', 'Yardımcı', 'Stajyer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Geçersiz rol. Asıl, Yardımcı veya Stajyer seçiniz.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if teacher exists and is active
    const teacherCheck = await client.query(
      `SELECT t."Teacher_ID", u."Status" 
       FROM "Teachers" t 
       JOIN "Users" u ON t."User_ID" = u."User_ID" 
       WHERE t."Teacher_ID" = $1`,
      [teacherId]
    );

    if (teacherCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
    }

    if (teacherCheck.rows[0].Status !== 'Aktif') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Pasif öğretmen atanamaz.' });
    }

    // Check if course exists
    const courseCheck = await client.query(
      `SELECT "Course_ID" FROM "Courses" WHERE "Course_ID" = $1`,
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Kurs bulunamadı.' });
    }

    // Check for conflicts (same teacher, same date)
    const conflictCheck = await client.query(
      `SELECT "Program_Teacher_ID" FROM "Program_Teachers" 
       WHERE "Teacher_ID" = $1 AND "Date" = $2`,
      [teacherId, assignmentDate]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Bu öğretmen bu tarihte zaten atanmış.' });
    }

    // Create assignment
    const result = await client.query(
      `INSERT INTO "Program_Teachers" 
       ("Teacher_ID", "Course_ID", "Date", "Role")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teacherId, courseId, assignmentDate, role]
    );

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Öğretmen başarıyla atandı.', 
      assignment: result.rows[0] 
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Get teacher assignments (with filters)
export const getTeacherAssignments = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim.' });
  }

  const { teacherId, courseId, startDate, endDate, role } = req.query;
  const values = [];
  let whereClause = '';

  if (teacherId) {
    values.push(teacherId);
    whereClause += ` AND pt."Teacher_ID" = $${values.length}`;
  }

  if (courseId) {
    values.push(courseId);
    whereClause += ` AND pt."Course_ID" = $${values.length}`;
  }

  if (startDate) {
    values.push(startDate);
    whereClause += ` AND pt."Date" >= $${values.length}`;
  }

  if (endDate) {
    values.push(endDate);
    whereClause += ` AND pt."Date" <= $${values.length}`;
  }

  if (role) {
    values.push(role);
    whereClause += ` AND pt."Role" = $${values.length}`;
  }

  try {
    const result = await pool.query(`
      SELECT 
        pt."Program_Teacher_ID", pt."Date", pt."Role",
        t."Teacher_ID", u."First_Name" AS "Teacher_First_Name", u."Last_Name" AS "Teacher_Last_Name",
        c."Course_ID", c."Course_Name", c."Level"
      FROM "Program_Teachers" pt
      JOIN "Teachers" t ON pt."Teacher_ID" = t."Teacher_ID"
      JOIN "Users" u ON t."User_ID" = u."User_ID"
      JOIN "Courses" c ON pt."Course_ID" = c."Course_ID"
      WHERE u."Status" = 'Aktif' ${whereClause}
      ORDER BY pt."Date" DESC
    `, values);

    res.json({ assignments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Delete teacher assignment
export const deleteTeacherAssignment = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler atama silebilir.' });
  }

  const assignmentId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignmentCheck = await client.query(
      `SELECT "Program_Teacher_ID" FROM "Program_Teachers" WHERE "Program_Teacher_ID" = $1`,
      [assignmentId]
    );

    if (assignmentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Atama bulunamadı.' });
    }

    await client.query(
      `DELETE FROM "Program_Teachers" WHERE "Program_Teacher_ID" = $1`,
      [assignmentId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Atama başarıyla silindi.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Get available teachers for a specific date
export const getAvailableTeachers = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim.' });
  }

  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Tarih bilgisi gerekli.' });
  }

  try {
    // Get all active teachers who are not assigned on the specified date
    const result = await pool.query(`
      SELECT 
        t."Teacher_ID", u."First_Name", u."Last_Name", u."Email",
        c."Category_Name"
      FROM "Teachers" t
      JOIN "Users" u ON t."User_ID" = u."User_ID"
      LEFT JOIN "Categories" c ON t."Category_ID" = c."Category_ID"
      WHERE u."Status" = 'Aktif'
      AND t."Teacher_ID" NOT IN (
        SELECT DISTINCT pt."Teacher_ID" 
        FROM "Program_Teachers" pt
        WHERE pt."Date" = $1
      )
      ORDER BY u."First_Name", u."Last_Name"
    `, [date]);

    res.json({ availableTeachers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Get teacher schedule for a specific teacher
export const getTeacherSchedule = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim.' });
  }

  const { teacherId } = req.params;
  const { startDate, endDate } = req.query;

  const values = [teacherId];
  let dateFilter = '';

  if (startDate) {
    values.push(startDate);
    dateFilter += ` AND pt."Date" >= $${values.length}`;
  }

  if (endDate) {
    values.push(endDate);
    dateFilter += ` AND pt."Date" <= $${values.length}`;
  }

  try {
    const result = await pool.query(`
      SELECT 
        pt."Program_Teacher_ID", pt."Date", pt."Role",
        c."Course_Name", c."Level"
      FROM "Program_Teachers" pt
      JOIN "Courses" c ON pt."Course_ID" = c."Course_ID"
      WHERE pt."Teacher_ID" = $1 ${dateFilter}
      ORDER BY pt."Date" ASC
    `, values);

    res.json({ schedule: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}; 