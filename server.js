// Imports and Initial Setup
import pool from './database_manage.js';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';  
import dotenv from 'dotenv';
import routes from './routes/index.js';

dotenv.config();
const result = await pool.query('SELECT NOW()');
console.log(result.rows);

//Sets up the Express app and enables parsing of JSON and form data
const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON and URL-encoded data (Session Setup)
app.use(session({
  secret: process.env.SESSION_SECRET || '2218',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

//Static Files
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Middleware to serve static files (if needed)
app.use(express.static(path.join(__dirname, 'Public')));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the modular routes
app.use('/', routes);
// Static file routes
app.get('/student_selection.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'student_selection.html'));
});

app.get('/teacher_assignments.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'teacher_assignments.html'));
});

app.get('/test_passive_users.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test_passive_users.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Robotum App is running on port http://localhost:${port}`);
});