import pool from '../../database_manage.js';

export const getDashboardStats = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    // Get total active students
    const studentsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM "Students" s
      JOIN "Users" u ON s."User_ID" = u."User_ID"
      WHERE u."Role_ID" = 4 AND u."Status" = 'Aktif'
    `);

    // Get total active guardians
    const guardiansResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM "Guardians" g
      JOIN "Users" u ON g."User_ID" = u."User_ID"
      WHERE u."Role_ID" = 3 AND u."Status" = 'Aktif'
    `);

    // Get total active teachers
    const teachersResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM "Teachers" t
      JOIN "Users" u ON t."User_ID" = u."User_ID"
      WHERE u."Role_ID" = 2 AND u."Status" = 'Aktif'
    `);

    // Get total active courses
    const coursesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM "Courses"
      WHERE "Status" = 'Aktif'
    `);

    const stats = {
      totalStudents: parseInt(studentsResult.rows[0].count),
      totalGuardians: parseInt(guardiansResult.rows[0].count),
      totalTeachers: parseInt(teachersResult.rows[0].count),
      totalCourses: parseInt(coursesResult.rows[0].count)
    };

    res.json(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
}; 

async function loadUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    alert('Lütfen giriş yapınız.');
    window.location.href = '/';
    return;
  }

  const user = JSON.parse(userStr);
  const email = encodeURIComponent(user.email);

  try {
    const response = await fetch(`/api/user?email=${email}`);
    if (!response.ok) {
      throw new Error('Kullanıcı bilgisi alınamadı');
    }
    const data = await response.json();

    document.getElementById('userName').textContent = data.name;
    document.getElementById('userEmail').textContent = data.email;
    document.getElementById('userPhone').textContent = data.phone;
    document.getElementById('lastLogin').textContent = data.lastLogin
      ? new Date(data.lastLogin).toLocaleString('tr-TR')
      : 'Bilinmiyor';

  } catch (error) {
    alert('Kullanıcı bilgisi yüklenirken hata oluştu.');
    console.error(error);
  }
}