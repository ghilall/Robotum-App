import pool from '../../database_manage.js';

// Get all students for admin
export const getAdminStudents = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  try {
    const result = await pool.query(`
      SELECT 
      s."Student_ID", u."First_Name", u."Last_Name", u."Email", u."Phone", u."Created_At",
      u."Created_At", u."Last_Login", r."Role_Name", gu."First_Name" AS "Guardian_First_Name",
      gu."Last_Name" AS "Guardian_Last_Name", gu."Phone" AS "Guardian_Phone",u."Status",u."Role_ID"
      FROM "Users" u
      JOIN "Roles" r ON u."Role_ID" = r."Role_ID"
      JOIN "Students" s ON u."User_ID" = s."User_ID"
      LEFT JOIN "Guardians" g ON s."Guardian_ID" = g."Guardian_ID"
      LEFT JOIN "Users" gu ON g."User_ID" = gu."User_ID"
      WHERE u."Role_ID" = 4 AND u."Status" = 'Aktif'
      ORDER BY u."Created_At" DESC
    `);
    res.json({ students: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Delete student status=pasif
export const deleteStudent = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler öğrenci silebilir.' });
  }
  const studentId = parseInt(req.params.id, 10);
  if (isNaN(studentId)) {
    return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const studentResult = await client.query(
      `SELECT "User_ID" FROM "Students" WHERE "Student_ID" = $1`,
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    const studentUserId = studentResult.rows[0].User_ID;
    await client.query(
      `UPDATE "Users" SET "Status" = 'Pasif' WHERE "User_ID" =$1`,
      [studentUserId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Öğrenci başarıyla pasif hale getirildi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// List students grouped by course for admin
export const getStudentList = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        s."Student_ID", u."First_Name", u."Last_Name", s."Birth_Date", c."Course_Name", c."Level", c."Category_ID",
        cat."Category_Name", p."Day", p."Start_Time", p."End_Time", p."Classroom_ID"
      FROM "Students" s
      JOIN "Users" u ON s."User_ID" = u."User_ID"
      JOIN "Enrollments" e ON s."Student_ID" = e."Student_ID"
      JOIN "Programs" p ON e."Program_ID" = p."Program_ID"
      JOIN "Courses" c ON p."Course_ID" = c."Course_ID"
      LEFT JOIN "Categories" cat ON c."Category_ID" = cat."Category_ID"
      WHERE u."Status" = 'Aktif'
      ORDER BY c."Course_Name", u."First_Name", 
        CASE p."Day"
      WHEN 'Pazartesi' THEN 1
      WHEN 'Salı' THEN 2
      WHEN 'Çarşamba' THEN 3
      WHEN 'Perşembe' THEN 4
      WHEN 'Cuma' THEN 5
      WHEN 'Cumartesi' THEN 6
      WHEN 'Pazar' THEN 7
        END, p."Start_Time"
    `);
    const grouped = {};
    result.rows.forEach(row => {
      const course = row.Course_Name;
      if (!grouped[course]) grouped[course] = {};
      const studentKey = `${row.Student_ID}`;
      if (!grouped[course][studentKey]) {
        grouped[course][studentKey] = {
          firstName: row.First_Name,
          lastName: row.Last_Name,
          studentId: row.Student_ID,
          birthDate: row.Birth_Date,
          courseLevel: row.Level,
          categoryId: row.Category_ID,
          categoryName: row.Category_Name,
          program: []
        };
      }
      if (row.Day) {
        grouped[course][studentKey].program.push({
          day: row.Day,
          start: row.Start_Time,
          end: row.End_Time,
          room: row.Classroom_ID
        });
      }
    });
    res.json({ grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Get passive students
export const getPassiveStudents = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        s."Student_ID", u."First_Name", u."Last_Name", u."Email", u."Phone", u."Created_At",
        u."Created_At", u."Last_Login", r."Role_Name", gu."First_Name" AS "Guardian_First_Name",
        gu."Last_Name" AS "Guardian_Last_Name", gu."Phone" AS "Guardian_Phone", u."Status", u."Role_ID"
      FROM "Users" u
      JOIN "Roles" r ON u."Role_ID" = r."Role_ID"
      JOIN "Students" s ON u."User_ID" = s."User_ID"
      LEFT JOIN "Guardians" g ON s."Guardian_ID" = g."Guardian_ID"
      LEFT JOIN "Users" gu ON g."User_ID" = gu."User_ID"
      WHERE u."Role_ID" = 4 AND u."Status" = 'Pasif'
      ORDER BY u."Created_At" DESC
    `);
    res.json({ students: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Reactivate passive student
export const reactivateStudent = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  const studentId = parseInt(req.params.id, 10);
  if (isNaN(studentId)) {
    return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const studentResult = await client.query(
      `SELECT "User_ID" FROM "Students" WHERE "Student_ID" = $1`,
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    const userId = studentResult.rows[0].User_ID;
    await client.query(
      `UPDATE "Users" SET "Status" = 'Aktif' WHERE "User_ID" = $1`,
      [userId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Öğrenci başarıyla aktif hale getirildi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Permanently delete student (hard delete)
export const permanentlyDeleteStudent = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler öğrenci silebilir.' });
  }
  const studentId = parseInt(req.params.id, 10);
  if (isNaN(studentId)) {
    return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const studentResult = await client.query(
      `SELECT "User_ID" FROM "Students" WHERE "Student_ID" = $1`,
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    const userId = studentResult.rows[0].User_ID;
    await client.query(`DELETE FROM "Enrollments" WHERE "Student_ID" = $1`, [studentId]);
    await client.query(`DELETE FROM "Students" WHERE "Student_ID" = $1`, [studentId]);
    await client.query(`DELETE FROM "Users" WHERE "User_ID" = $1`, [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Öğrenci kalıcı olarak silindi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT "Category_ID", "Category_Name" FROM "Categories" ORDER BY "Category_Name"
    `);
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Category fetch error:', err);
    res.status(500).json({ error: 'Kategori verisi alınamadı' });
  }
};

// PUT /api/admin/students/:studentId
export const updateStudent = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  const studentId = parseInt(req.params.studentId, 10);
  const { firstName, lastName, birthDate } = req.body;
  if (isNaN(studentId)) {
    return res.status(400).json({ error: 'Geçersiz öğrenci ID' });
  }
  try {
    // Get User_ID for this student
    const userResult = await pool.query(
      `SELECT "User_ID" FROM "Students" WHERE "Student_ID" = $1`,
      [studentId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    const userId = userResult.rows[0].User_ID;
    // Update Users table (name, surname)
    await pool.query(
      `UPDATE "Users" SET "First_Name" = $1, "Last_Name" = $2 WHERE "User_ID" = $3`,
      [firstName, lastName, userId]
    );
    // Update Students table (birth date)
    await pool.query(
      `UPDATE "Students" SET "Birth_Date" = $1 WHERE "Student_ID" = $2`,
      [birthDate, studentId]
    );
    res.json({ message: 'Öğrenci bilgileri güncellendi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// PUT /api/admin/students/:studentId/change-course
export const changeStudentCourse = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  const studentId = parseInt(req.params.studentId, 10);
  const { courseId, programId } = req.body;
  if (isNaN(studentId) || !courseId || !programId) {
    return res.status(400).json({ error: 'Eksik veya hatalı veri.' });
  }
  try {
    // Remove old program assignments
    await pool.query(
      `DELETE FROM "Enrollments" WHERE "Student_ID" = $1`,
      [studentId]
    );
    // Add new program assignment
    await pool.query(
      `INSERT INTO "Enrollments" ("Student_ID", "Program_ID", "Enrollment_Date") VALUES ($1, $2, NOW())`,
      [studentId, programId]
    );
    res.json({ message: 'Kurs ve program güncellendi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}; 