// Imports and Initial Setup
import pool from './database_manage.js';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';  
import dotenv from 'dotenv';
dotenv.config();

const result = await pool.query('SELECT NOW()');
console.log(result.rows);

const port = 3000;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON and URL-encoded data
app.use(session({
  secret: '2218',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Middleware to serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Register User(Guardian)
app.post('/register', async (req, res) => {
  const { firstName, lastName, phone, email, password, occupation } = req.body;

   try {
const result = await pool.query(
  `INSERT INTO "Users" ("First_Name", "Last_Name", "Phone", "Email", "Password", "Role_ID", "Created_At")
   VALUES ($1, $2, $3, $4, $5, $6, NOW())
   RETURNING *`,
  [firstName, lastName, phone, email, password, 3] // Role_ID 3 for Guardian
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
});

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Query user by email only
    const result = await pool.query(
      `SELECT * FROM "Users" WHERE "Email" = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'email_not_registered' });
    }
    const user = result.rows[0];

    if (user.Password !== password) {
      return res.status(401).json({ error: 'incorrect_password' });
    }

    req.session.user = user; // Successful login
    await pool.query(
     `UPDATE "Users" SET "Last_Login" = NOW() WHERE "User_ID" = $1`, //last login time update
    [user.User_ID]
    );
    res.status(200).json({ message: 'Giriş başarılı', user });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Giriş işlemi başarısız oldu' }); //http status code 500 for server error
  }
});

// New endpoint to get user info by email for dashboard
app.get('/api/user', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  try {
    const result = await pool.query(
      `SELECT "First_Name", "Last_Name", "Email", "Phone", "Last_Login" FROM "Users" WHERE "Email" = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      name: `${user.First_Name} ${user.Last_Name}`,
      email: user.Email,
      phone: user.Phone,
      lastLogin: user.Last_Login

    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/dashboard/students', async (req, res) => {
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
      `SELECT s."Student_ID", s."Birth_Date", s."Course_ID", c."Course_Name", u."Status",
              u."First_Name", u."Last_Name"
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
});

// Student registration endpoint for admin
app.post('/student_register', async (req, res) => {
  const { firstName, lastName, birthDate, courseId, guardianId } = req.body;

  if (!guardianId) {
    return res.status(400).json({ error: 'Veli seçimi zorunludur.' });
  }

  if (!firstName || !lastName || !birthDate || !courseId) {
    return res.status(400).json({ error: 'İsim, soyisim, doğum tarihi ve kurs zorunludur.' });
  }

  try {
    // Optional: verify guardianId exists in DB
    const guardianCheck = await pool.query(
      `SELECT "Guardian_ID" FROM "Guardians" WHERE "Guardian_ID" = $1`,
      [guardianId]
    );

    if (guardianCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Geçersiz veli bilgisi.' });
    }

    // Insert student as user with Role_ID=4
    const userResult = await pool.query(
      `INSERT INTO "Users" ("First_Name", "Last_Name", "Role_ID", "Created_At") 
       VALUES ($1, $2, 4, NOW()) RETURNING "User_ID"`,
      [firstName, lastName]
    );

    const userId = userResult.rows[0].User_ID;

    // Insert student linked to the selected guardianId
    const studentResult = await pool.query(
      `INSERT INTO "Students" ("Birth_Date", "Course_ID", "User_ID", "Guardian_ID")
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [birthDate, courseId, userId, guardianId]
    );

    res.json({ message: 'Kayıt başarıyla tamamlandı.', student: studentResult.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

//Get students for guardian (öğrenci seç) via API
app.get('/api/guardian/students', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  console.log('Session user on /api/guardian/students:', req.session.user);

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
});

app.get('/student_selection.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'student_selection.html'));
});

app.delete('/api/students/:id', async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler öğrenci silebilir.' });
  }

  const studentId = req.params.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Transaction başlat

    // Öğrencinin User_ID'sini al
    const studentResult = await client.query(
      `SELECT "User_ID" FROM "Students" WHERE "Student_ID" = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK'); // Transaction iptal
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }

    const studentUserId = studentResult.rows[0].User_ID;

    // Öğrenciyi Students tablosundan sil
    await client.query(`DELETE FROM "Students" WHERE "Student_ID" = $1`, [studentId]);
    // İlgili kullanıcı kaydını Users tablosundan sil
    await client.query(`DELETE FROM "Users" WHERE "User_ID" = $1`, [studentUserId]);

    await client.query('COMMIT'); // Transaction başarılı, değişiklikleri kaydet

    res.json({ message: 'Öğrenci başarıyla silindi.' });

  } catch (err) {
    await client.query('ROLLBACK'); // Hata durumunda değişiklikleri geri al
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release(); // Bağlantıyı serbest bırak
  }
});

// Search Guardians by name
app.get('/api/guardians/search', async (req, res) => {
  const query = req.query.query;

  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT g."Guardian_ID", u."First_Name", u."Last_Name", u."Email"
       FROM "Guardians" g
       JOIN "Users" u ON g."User_ID" = u."User_ID"
       WHERE (u."First_Name" ILIKE $1 OR u."Last_Name" ILIKE $1)
       ORDER BY u."First_Name" ASC
       LIMIT 10`,
      [`%${query}%`]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Guardians search error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin route to get all students
app.get('/api/admin/students', async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const result = await pool.query(`
      SELECT u."User_ID", u."First_Name", u."Last_Name", u."Email", u."Phone", u."Role_ID", u."Created_At", u."Last_Login",
             r."Role_Name"
      FROM "Users" u
      JOIN "Roles" r ON u."Role_ID" = r."Role_ID"
      WHERE u."Role_ID" = 4
      ORDER BY u."Created_At" DESC
    `);

    res.json({ students: result.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Robotum App is running on http://localhost:${port}`);
});