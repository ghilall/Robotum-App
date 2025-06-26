import pool from '../database_manage.js';

//Get students for guardian (öğrenci seç) via API
export const getGuardianStudents = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  console.log('Session user on /api/guardian/students:', req.session.user);
  const userId = req.session.user.User_ID;
  console.log('Session:', req.session);
  try {
    // Find Guardian_ID for logged-in user
    const guardianResult = await pool.query(
      `SELECT "Guardian_ID" FROM "Guardians" WHERE "User_ID" = $1`,
      [req.session.user.User_ID]
    );

    if (guardianResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guardian info not found' });
    }

    const guardianId = guardianResult.rows[0].Guardian_ID;

    // Fetch students linked to this Guardian_ID
    const studentsResult = await pool.query(
      `SELECT s."Student_ID", u."First_Name", u."Last_Name", s."Birth_Date", c."Course_Name", u."Status"
       FROM "Students" s
       JOIN "Users" u ON s."User_ID" = u."User_ID"
       JOIN "Courses" c ON s."Course_ID" = c."Course_ID"
       WHERE s."Guardian_ID" = $1`,
      [guardianId]
    );

    res.json({ students: studentsResult.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get student dashboards for guardian
export const getStudentDashboards = async (req, res) => {
  if (!req.session.user) {
    console.log('Unauthorized access - no user session');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.User_ID;
  console.log('Logged-in userId:', userId);

  try {
    const guardianResult = await pool.query(
      `SELECT "Guardian_ID" FROM "Guardians" WHERE "User_ID" = $1`,
      [userId]
    );

    console.log('Guardian query result:', guardianResult.rows);

    if (guardianResult.rows.length === 0) {
      return res.status(404).json({ students: [] });
    }

    const guardianId = guardianResult.rows[0].Guardian_ID;
    console.log('Found guardianId:', guardianId);

    const studentsResult = await pool.query(
      `SELECT s."Student_ID", s."Birth_Date", s."Course_ID", c."Course_Name", u."Status", u."First_Name", u."Last_Name"
       FROM "Students" s
       JOIN "Courses" c ON s."Course_ID" = c."Course_ID"
       JOIN "Users" u ON s."User_ID" = u."User_ID"
       WHERE s."Guardian_ID" = $1`,
      [guardianId]
    );

    console.log('Students query result:', studentsResult.rows);

    res.json({ students: studentsResult.rows });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

//Öğrenci Dashboard için bilgileri getiren API
export const getStudentInfo = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const studentId = parseInt(req.params.id, 10);
if (isNaN(studentId)) return res.status(400).json({ error: 'Geçersiz öğrenci ID' });

  try {
    // 1. Öğrenci temel bilgileri
    const studentResult = await pool.query(`
      SELECT s."Student_ID", u."First_Name", u."Last_Name", s."Birth_Date", c."Course_Name", u."Status"
      FROM "Students" s
      JOIN "Users" u ON s."User_ID" = u."User_ID"
      JOIN "Courses" c ON s."Course_ID" = c."Course_ID"
      WHERE s."Student_ID" = $1
    `, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı' });
    }
    const studentInfo = studentResult.rows[0];

    // 2. Öğrencinin seçtiği program saatleri
    const programResult = await pool.query(`
      SELECT p."Program_ID", p."Day", p."Start_Time", p."End_Time", p."Classroom_ID"
      FROM "Program_Students" ps
      JOIN "Programs" p ON ps."Program_ID" = p."Program_ID"
      WHERE ps."Student_ID" = $1
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
    `, [studentId]);

    // 3. JSON olarak birleşmiş veri döndür
    res.json({
      ...studentInfo, Programs: programResult.rows  // [{ Day, Start_Time, End_Time, ... }]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// GET program for selected student
export const getStudentProgram = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const studentId = req.params.id;
  try {
    // Get programs assigned to this student via Program_Studentsjoin
  const programResult = await pool.query(
    `SELECT "Day", "Start_Time", "End_Time", "Classroom_ID"
    FROM "Programs"
    WHERE "Course_ID" = $1
    ORDER BY 
      CASE "Day"
      WHEN 'Pazartesi' THEN 1
      WHEN 'Salı' THEN 2
      WHEN 'Çarşamba' THEN 3
      WHEN 'Perşembe' THEN 4
      WHEN 'Cuma' THEN 5
      WHEN 'Cumartesi' THEN 6
      WHEN 'Pazar' THEN 7
      END, "Start_Time"`,
    [courseId]
  );

    res.json({ program: programResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
}; 