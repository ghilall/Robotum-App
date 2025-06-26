import pool from '../../database_manage.js';

// Get all teachers for admin
export const getAdminTeachers = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        t."Teacher_ID", u."User_ID", u."First_Name", u."Last_Name", u."Email", u."Phone", 
        t."Experience", st."Start_Date" AS "StartDate",  st."End_Date" AS "EndDate",
        c."Category_Name" AS "CategoryName", u."Last_Login"
      FROM "Users" u
      JOIN "Teachers" t ON u."User_ID" = t."User_ID"
      JOIN "Staff" st ON t."Staff_ID" = st."Staff_ID"
      LEFT JOIN "Categories" c ON t."Category_ID" = c."Category_ID"
      WHERE u."Role_ID" = 2 AND u."Status" = 'Aktif'
      ORDER BY u."Created_At" DESC
    `);
    res.json({ teachers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Delete teacher by ID
export const deleteTeacher = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler öğretmen silebilir.' });
  }
  const teacherId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const teacherResult = await client.query(
      `SELECT "User_ID" FROM "Teachers" WHERE "Teacher_ID" = $1`,
      [teacherId]
    );
    if (teacherResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
    }
    const userId = teacherResult.rows[0].User_ID;
    await client.query(`UPDATE "Users" SET "Status" = 'Pasif' WHERE "User_ID" = $1`, [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Öğretmen pasif hale getirildi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Get passive teachers
export const getPassiveTeachers = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        t."Teacher_ID", u."User_ID", u."First_Name", u."Last_Name", u."Email", u."Phone", 
        t."Experience", st."Start_Date" AS "StartDate", st."End_Date" AS "EndDate",
        c."Category_Name" AS "CategoryName", u."Last_Login"
      FROM "Users" u
      JOIN "Teachers" t ON u."User_ID" = t."User_ID"
      JOIN "Staff" st ON t."Staff_ID" = st."Staff_ID"
      LEFT JOIN "Categories" c ON t."Category_ID" = c."Category_ID"
      WHERE u."Role_ID" = 2 AND u."Status" = 'Pasif'
      ORDER BY u."Created_At" DESC
    `);
    res.json({ teachers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Reactivate passive teacher
export const reactivateTeacher = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  const teacherId = parseInt(req.params.id, 10);
  if (isNaN(teacherId)) {
    return res.status(400).json({ error: 'Geçersiz öğretmen ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const teacherResult = await client.query(
      `SELECT "User_ID" FROM "Teachers" WHERE "Teacher_ID" = $1`,
      [teacherId]
    );
    if (teacherResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
    }
    const userId = teacherResult.rows[0].User_ID;
    await client.query(
      `UPDATE "Users" SET "Status" = 'Aktif' WHERE "User_ID" = $1`,
      [userId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Öğretmen başarıyla aktif hale getirildi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Permanently delete teacher (hard delete)
export const permanentlyDeleteTeacher = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler öğretmen silebilir.' });
  }
  const teacherId = parseInt(req.params.id, 10);
  if (isNaN(teacherId)) {
    return res.status(400).json({ error: 'Geçersiz öğretmen ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const teacherResult = await client.query(
      `SELECT "User_ID", "Staff_ID" FROM "Teachers" WHERE "Teacher_ID" = $1`,
      [teacherId]
    );
    if (teacherResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
    }
    const userId = teacherResult.rows[0].User_ID;
    const staffId = teacherResult.rows[0].Staff_ID;
    await client.query(`DELETE FROM "Teachers" WHERE "Teacher_ID" = $1`, [teacherId]);
    await client.query(`DELETE FROM "Staff" WHERE "Staff_ID" = $1`, [staffId]);
    await client.query(`DELETE FROM "Users" WHERE "User_ID" = $1`, [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Öğretmen kalıcı olarak silindi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
}; 