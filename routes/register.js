import bcrypt from 'bcrypt';
import pool from '../database_manage.js';

// Register Guardian
export const registerGuardian = async (req, res) => {
  const { firstName, lastName, phone, email, password, occupation } = req.body;

   try {
    const hashedPassword = await bcrypt.hash(password, 10);

const result = await pool.query(
  `INSERT INTO "Users" ("First_Name", "Last_Name", "Phone", "Email", "Password", "Role_ID", "Created_At")
   VALUES ($1, $2, $3, $4, $5, $6, NOW())
   RETURNING *`,
  [firstName, lastName, phone, email, hashedPassword, 3] // Role_ID 3 for Guardian
);
const user = result.rows[0]; 

//Make User Guardian
 if (user.Role_ID === 3) {
      await pool.query(
        `INSERT INTO "Guardians" ("User_ID", "Occupation_ID")
         VALUES ($1, $2)`,
        [user.User_ID, occupation || null]
      );
    }

    // Optionally respond with success JSON (for frontend)
    res.status(201).json({ message: 'Kayıt başarılı', user: result.rows[0] });

  } catch (error) {
    if (error.code === '23505') {
      // Optional: check if it's the email unique constraint
      if (error.constraint === 'Users_Email_key' || error.detail?.includes('email')) {
        return res.status(409).json({
          field: 'email',
          error: 'Bu email adresi ile bir hesap bulunuyor.'
        });
      }
    }

    console.error(error);
    res.status(500).json({ error: 'Kayıt işlemi başarısız oldu.' });
  }
};

export const registerTeacher = async (req, res) => {
  const {
    firstName, lastName, phone, email, password, salary, socialSecurityNumber, employmentType, 
    startDate, endDate, categoryId, experience } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Step 1: Insert into Users
    const userResult = await client.query(
      `INSERT INTO "Users" 
        ("First_Name", "Last_Name", "Phone", "Email", "Password", "Role_ID", "Created_At")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING "User_ID"`,
      [firstName, lastName, phone, email, hashedPassword, 2]
    );
    const userId = userResult.rows[0].User_ID;

    // Step 2: Insert into Staff
    const staffResult = await client.query(
      `INSERT INTO "Staff" 
        ("User_ID", "Role_ID", "Salary", "Social_Security_Number", "Employment_Type", "Start_Date", "End_Date")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING "Staff_ID"`,
      [userId, 2, salary, socialSecurityNumber, employmentType, startDate, endDate || null]
    );
    const staffId = staffResult.rows[0].Staff_ID;

    await client.query(
      `INSERT INTO "Teachers" 
        ("User_ID", "Staff_ID", "Category_ID", "Experience")
       VALUES ($1, $2, $3, $4)`,
      [userId, staffId, categoryId, experience]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Öğretmen başarıyla kaydedildi.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Teacher registration error:', error);
    if (error.code === '23505' && error.constraint?.includes('Users_Email_key')) {
      return res.status(409).json({
        field: 'email',
        error: 'Bu email adresi zaten kayıtlı.'
      });
    }
    res.status(500).json({ error: 'Öğretmen kaydı başarısız oldu.' });
  } finally {
    client.release();
  }
};

// Student registration endpoint for admin
export const registerStudent = async (req, res) => {
  const { firstName, lastName, birthDate, courseId, guardianId, selectedProgramIds } = req.body;

  if (!guardianId) {
    return res.status(400).json({ error: 'Veli seçimi zorunludur.' });
  }

  if (!firstName || !lastName || !birthDate || !courseId) {
    return res.status(400).json({ error: 'İsim, soyisim, doğum tarihi ve kurs zorunludur.' });
  }

  if (!selectedProgramIds || !Array.isArray(selectedProgramIds) || selectedProgramIds.length === 0) {
    return res.status(400).json({ error: 'Lütfen en az bir ders saati seçin.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const guardianCheck = await client.query(
      `SELECT "Guardian_ID" FROM "Guardians" WHERE "Guardian_ID" = $1`,
      [guardianId]
    );
    if (guardianCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Geçersiz veli bilgisi.' });
    }

    const userResult = await client.query(
      `INSERT INTO "Users" ("First_Name", "Last_Name", "Role_ID", "Created_At") 
       VALUES ($1, $2, 4, NOW()) RETURNING "User_ID"`,
      [firstName, lastName]
    );

    const userId = userResult.rows[0].User_ID;

    const studentResult = await client.query(
      `INSERT INTO "Students" ("Birth_Date", "Course_ID", "User_ID", "Guardian_ID")
       VALUES ($1, $2, $3, $4) RETURNING "Student_ID"`,
      [birthDate, courseId, userId, guardianId]
    );

    const studentId = studentResult.rows[0].Student_ID;

    for (const progId of selectedProgramIds) {
      await client.query(
        `INSERT INTO "Program_Students" ("Student_ID", "Program_ID") VALUES ($1, $2)`,
        [studentId, progId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Kayıt başarıyla tamamlandı.', student: studentResult.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
}; 