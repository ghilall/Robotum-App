import bcrypt from 'bcrypt';
import pool from '../database_manage.js';

// Login route
export const login = async (req, res) => {
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
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
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
};

// Get user info by email for dashboard
export const getUserInfo = async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  try {
    const result = await pool.query(
      `SELECT "First_Name", "Last_Name", "Email", "Phone", "Last_Login" FROM "Users" WHERE "Email" = $1`, //"$1" so uses email to fetch user info
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
}; 