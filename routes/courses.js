import pool from '../database_manage.js';

//kursa ait saatleri dinamik olarak çekme
export const getProgramsByCourse = async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  if (isNaN(courseId)) return res.status(400).json({ error: 'Geçersiz kurs ID' });

  try {
    const result = await pool.query(`
      SELECT 
        p."Program_ID", p."Day", p."Start_Time", p."End_Time", p."Classroom_ID", p."Capacity",
        COUNT(sp."Student_ID") AS "Current_Count"
      FROM "Programs" p
      LEFT JOIN "Program_Students" sp ON p."Program_ID" = sp."Program_ID"
      WHERE p."Course_ID" = $1
      GROUP BY p."Program_ID", p."Day", p."Start_Time", p."End_Time", p."Classroom_ID", p."Capacity"
      ORDER BY 
        CASE p."Day"
          WHEN 'Pazartesi' THEN 1
          WHEN 'Salı' THEN 2
          WHEN 'Çarşamba' THEN 3
          WHEN 'Perşembe' THEN 4
          WHEN 'Cuma' THEN 5
          WHEN 'Cumartesi' THEN 6
          WHEN 'Pazar' THEN 7
        END, p."Start_Time"
    `, [courseId]);

    res.json({ programs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Programlar alınamadı.' });
  }
};

//student kayıt için get fonksiyonu kategoriler 
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

//student kayıt için get fonksiyonu kurs leveli 
export const getCourseLevels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT "Level" FROM "Courses" 
      WHERE "Level" IS NOT NULL 
      ORDER BY "Level"
    `);
    const levels = result.rows.map(row => row.Level);
    res.json({ levels });
  } catch (err) {
    console.error('Course levels fetch error:', err);
    res.status(500).json({ error: 'Kurs seviyeleri alınamadı' });
  }
};

export const getCourses = async (req, res) => {
  const { categoryId, level } = req.query;
  const values = [];
  let whereClause = '';

  if (categoryId) {
    values.push(categoryId);
    whereClause += ` AND "Category_ID" = $${values.length}`;
  }
  if (level) {
    values.push(level);
    whereClause += ` AND "Level" = $${values.length}`;
  }
  try {
    const result = await pool.query(`
      SELECT "Course_ID", "Course_Name", "Level", "Category_ID"
      FROM "Courses"
      WHERE 1=1 ${whereClause}
      ORDER BY "Course_Name"
    `, values);

    res.json({ courses: result.rows });
  } catch (err) {
    console.error('Course filter error:', err);
    res.status(500).json({ error: 'Kurslar alınamadı' });
  }
}; 