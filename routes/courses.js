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
  const { categoryId, level, difficulty } = req.query;
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
  if (difficulty) {
    values.push(difficulty);
    whereClause += ` AND "Difficulty" = $${values.length}`;
  }
  try {
    const result = await pool.query(`
      SELECT c."Course_ID", c."Course_Name", c."Level", c."Category_ID", c."Status", c."Difficulty"
      FROM "Courses" c
      WHERE 1=1 ${whereClause}
      ORDER BY c."Course_Name"
    `, values);

    res.json({ courses: result.rows });
  } catch (err) {
    console.error('Course filter error:', err);
    res.status(500).json({ error: 'Kurslar alınamadı' });
  }
};

export const addCourse = async (req, res) => {
  const { name, category, level, difficulty, status } = req.body;
  if (!name || !category || !level || !difficulty || !status) {
    return res.status(400).json({ error: 'Kurs adı, kategori, seviye, zorluk ve durum zorunludur.' });
  }
  try {
    // Insert the course
    const result = await pool.query(
      `INSERT INTO "Courses" ("Course_Name", "Category_ID", "Level", "Difficulty", "Status")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING "Course_ID", "Course_Name", "Category_ID", "Level", "Difficulty", "Status"`,
      [name, category, level, difficulty, status]
    );
    res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    console.error('Kurs ekleme hatası:', err);
    res.status(500).json({ error: 'Kurs eklenemedi.' });
  }
};

export const updateCourse = async (req, res) => {
  const { courseId } = req.params;
  const { name, category, level, difficulty, status } = req.body;
  
  if (!courseId) {
    return res.status(400).json({ error: 'Kurs ID gerekli.' });
  }
  
  if (!name || !category || !level || !difficulty || !status) {
    return res.status(400).json({ error: 'Kurs adı, kategori, seviye, zorluk ve durum zorunludur.' });
  }

  try {
    const result = await pool.query(
      `UPDATE "Courses" 
       SET "Course_Name" = $1, "Category_ID" = $2, "Level" = $3, "Difficulty" = $4, "Status" = $5
       WHERE "Course_ID" = $6
       RETURNING "Course_ID", "Course_Name", "Category_ID", "Level", "Difficulty", "Status"`,
      [name, category, level, difficulty, status, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kurs bulunamadı.' });
    }

    res.json({ 
      course: result.rows[0],
      message: 'Kurs başarıyla güncellendi.'
    });
  } catch (err) {
    console.error('Kurs güncelleme hatası:', err);
    res.status(500).json({ error: 'Kurs güncellenemedi.' });
  }
};

export const deleteCourse = async (req, res) => {
  const { courseId } = req.params;
  
  if (!courseId) {
    return res.status(400).json({ error: 'Kurs ID gerekli.' });
  }

  try {
    // First check if the course exists and is passive
    const checkResult = await pool.query(
      `SELECT "Course_ID", "Course_Name", "Status" FROM "Courses" WHERE "Course_ID" = $1`,
      [courseId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kurs bulunamadı.' });
    }

    const course = checkResult.rows[0];
    if (course.Status !== 'Pasif') {
      return res.status(400).json({ error: 'Sadece pasif kurslar kalıcı olarak silinebilir.' });
    }

    // Delete the course
    const result = await pool.query(
      `DELETE FROM "Courses" WHERE "Course_ID" = $1 RETURNING "Course_ID", "Course_Name"`,
      [courseId]
    );

    res.json({ 
      message: `"${course.Course_Name}" kursu kalıcı olarak silindi.`
    });
  } catch (err) {
    console.error('Kurs silme hatası:', err);
    res.status(500).json({ error: 'Kurs silinemedi.' });
  }
};

export const toggleCourseStatus = async (req, res) => {
  const { courseId } = req.params;
  
  if (!courseId) {
    return res.status(400).json({ error: 'Kurs ID gerekli.' });
  }

  try {
    // First get the current status
    const currentStatusResult = await pool.query(
      `SELECT "Status" FROM "Courses" WHERE "Course_ID" = $1`,
      [courseId]
    );

    if (currentStatusResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kurs bulunamadı.' });
    }

    const currentStatus = currentStatusResult.rows[0].Status;
    const newStatus = currentStatus === 'Aktif' ? 'Pasif' : 'Aktif';

    // Update the status
    const result = await pool.query(
      `UPDATE "Courses" SET "Status" = $1 WHERE "Course_ID" = $2 RETURNING "Course_ID", "Course_Name", "Status"`,
      [newStatus, courseId]
    );

    res.json({ 
      course: result.rows[0],
      message: `Kurs ${newStatus === 'Aktif' ? 'aktifleştirildi' : 'pasif hale getirildi'}.`
    });
  } catch (err) {
    console.error('Kurs durumu değiştirme hatası:', err);
    res.status(500).json({ error: 'Kurs durumu değiştirilemedi.' });
  }
};

// Get available classrooms
export const getClassrooms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT "Classroom_ID", "Classroom_Name" 
      FROM "Classrooms" 
      ORDER BY "Classroom_Name"
    `);
    res.json({ classrooms: result.rows });
  } catch (err) {
    console.error('Classroom fetch error:', err);
    res.status(500).json({ error: 'Sınıf verisi alınamadı' });
  }
};

// Get classrooms by category
export const getClassroomsByCategory = async (req, res) => {
  const { categoryId } = req.params;
  
  if (!categoryId) {
    return res.status(400).json({ error: 'Kategori ID gerekli.' });
  }

  try {
    const result = await pool.query(`
      SELECT "Classroom_ID", "Classroom_Name", "Capacity"
      FROM "Classrooms" 
      WHERE "Category_ID" = $1
      ORDER BY "Classroom_Name"
    `, [categoryId]);
    res.json({ classrooms: result.rows });
  } catch (err) {
    console.error('Classroom fetch error:', err);
    res.status(500).json({ error: 'Sınıf verisi alınamadı' });
  }
};

// Add program to course
export const addProgram = async (req, res) => {
  const { courseId, day, startTime, endTime, classroomId, capacity } = req.body;
  
  if (!courseId || !day || !startTime || !endTime || !classroomId || !capacity) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
  }

  // Validate capacity is a positive number
  if (isNaN(capacity) || capacity <= 0) {
    return res.status(400).json({ error: 'Kapasite pozitif bir sayı olmalıdır.' });
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({ error: 'Saat formatı HH:MM olmalıdır.' });
  }

  // Validate start time is before end time
  if (startTime >= endTime) {
    return res.status(400).json({ error: 'Başlangıç saati bitiş saatinden önce olmalıdır.' });
  }

  try {
    // Check if course exists
    const courseCheck = await pool.query(
      `SELECT "Course_ID", "Course_Name" FROM "Courses" WHERE "Course_ID" = $1`,
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Kurs bulunamadı.' });
    }

    // Check if classroom exists and is active
    const classroomCheck = await pool.query(
      `SELECT "Classroom_ID", "Classroom_Name" FROM "Classrooms" WHERE "Classroom_ID" = $1`,
      [classroomId]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sınıf bulunamadı.' });
    }

    // Check for time conflicts in the same classroom
    const conflictCheck = await pool.query(`
      SELECT p."Program_ID", c."Course_Name", p."Day", p."Start_Time", p."End_Time"
      FROM "Programs" p
      JOIN "Courses" c ON p."Course_ID" = c."Course_ID"
      WHERE p."Classroom_ID" = $1 
        AND p."Day" = $2
        AND (
          (p."Start_Time" <= $3 AND p."End_Time" > $3) OR
          (p."Start_Time" < $4 AND p."End_Time" >= $4) OR
          (p."Start_Time" >= $3 AND p."End_Time" <= $4)
        )
    `, [classroomId, day, startTime, endTime]);

    if (conflictCheck.rows.length > 0) {
      const conflict = conflictCheck.rows[0];
      return res.status(409).json({ 
        error: `Sınıf zaman çakışması: ${conflict.Course_Name} - ${conflict.Day} ${conflict.Start_Time}-${conflict.End_Time}` 
      });
    }

    // Insert the new program
    const result = await pool.query(`
      INSERT INTO "Programs" ("Course_ID", "Day", "Start_Time", "End_Time", "Classroom_ID", "Capacity")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING "Program_ID", "Course_ID", "Day", "Start_Time", "End_Time", "Classroom_ID", "Capacity"
    `, [courseId, day, startTime, endTime, classroomId, capacity]);

    res.status(201).json({ 
      program: result.rows[0],
      message: 'Program başarıyla eklendi.'
    });
  } catch (err) {
    console.error('Program ekleme hatası:', err);
    res.status(500).json({ error: 'Program eklenemedi.' });
  }
}; 