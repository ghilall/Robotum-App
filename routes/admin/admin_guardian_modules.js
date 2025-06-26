import pool from '../../database_manage.js';

// Get all guardians for admin
export const getAdminGuardians = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        g."Guardian_ID", u."User_ID", u."First_Name", u."Last_Name", u."Email", 
        u."Phone", s."Student_ID", su."First_Name" AS "Student_First_Name", 
        su."Last_Name" AS "Student_Last_Name"
      FROM "Guardians" g
      JOIN "Users" u ON g."User_ID" = u."User_ID"
      LEFT JOIN "Students" s ON g."Guardian_ID" = s."Guardian_ID"
      LEFT JOIN "Users" su ON s."User_ID" = su."User_ID"
      WHERE u."Role_ID" = 3 AND u."Status" = 'Aktif'
      ORDER BY u."First_Name"
    `);
    const grouped = {};
    result.rows.forEach(row => {
      const gid = row.Guardian_ID;
      if (!grouped[gid]) {
        grouped[gid] = {
          Guardian_ID: gid,
          First_Name: row.First_Name,
          Last_Name: row.Last_Name,
          Email: row.Email,
          Phone: row.Phone,
          Students: []
        };
      }
      if (row.Student_ID) {
        grouped[gid].Students.push({
          Student_ID: row.Student_ID,
          First_Name: row.Student_First_Name,
          Last_Name: row.Student_Last_Name
        });
      }
    });
    res.json({ guardians: Object.values(grouped) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Delete guardian by ID
export const deleteGuardian = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler veli silebilir.' });
  }
  const guardianId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const guardianResult = await client.query(
      `SELECT "User_ID" FROM "Guardians" WHERE "Guardian_ID" = $1`,
      [guardianId]
    );
    if (guardianResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Veli bulunamadı.' });
    }
    const userId = guardianResult.rows[0].User_ID;
    await client.query(`UPDATE "Users" SET "Status" = 'Pasif' WHERE "User_ID" = $1`, [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Veli pasif hale getirildi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Search Guardians by name for student registration
export const searchGuardians = async (req, res) => {
  const query = req.query.query;
  if (!query || query.length < 2) {
    return res.json([]);
  }
  try {
    const result = await pool.query(
      `SELECT g."Guardian_ID", u."First_Name", u."Last_Name", u."Email"
       FROM "Guardians" g
       JOIN "Users" u ON g."User_ID" = u."User_ID"
       WHERE unaccent(lower(u."First_Name")) LIKE unaccent(lower($1))
          OR unaccent(lower(u."Last_Name")) LIKE unaccent(lower($1))
       ORDER BY u."First_Name" ASC
       LIMIT 10`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Guardians search error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Get passive guardians
export const getPassiveGuardians = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        g."Guardian_ID", u."User_ID", u."First_Name", u."Last_Name", u."Email", 
        u."Phone", s."Student_ID", su."First_Name" AS "Student_First_Name", 
        su."Last_Name" AS "Student_Last_Name"
      FROM "Guardians" g
      JOIN "Users" u ON g."User_ID" = u."User_ID"
      LEFT JOIN "Students" s ON g."Guardian_ID" = s."Guardian_ID"
      LEFT JOIN "Users" su ON s."User_ID" = su."User_ID"
      WHERE u."Role_ID" = 3 AND u."Status" = 'Pasif'
      ORDER BY u."First_Name"
    `);
    const grouped = {};
    result.rows.forEach(row => {
      const gid = row.Guardian_ID;
      if (!grouped[gid]) {
        grouped[gid] = {
          Guardian_ID: gid,
          First_Name: row.First_Name,
          Last_Name: row.Last_Name,
          Email: row.Email,
          Phone: row.Phone,
          Students: []
        };
      }
      if (row.Student_ID) {
        grouped[gid].Students.push({
          Student_ID: row.Student_ID,
          First_Name: row.Student_First_Name,
          Last_Name: row.Student_Last_Name
        });
      }
    });
    res.json({ guardians: Object.values(grouped) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// Reactivate passive guardian
export const reactivateGuardian = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  const guardianId = parseInt(req.params.id, 10);
  if (isNaN(guardianId)) {
    return res.status(400).json({ error: 'Geçersiz veli ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const guardianResult = await client.query(
      `SELECT "User_ID" FROM "Guardians" WHERE "Guardian_ID" = $1`,
      [guardianId]
    );
    if (guardianResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Veli bulunamadı.' });
    }
    const userId = guardianResult.rows[0].User_ID;
    await client.query(
      `UPDATE "Users" SET "Status" = 'Aktif' WHERE "User_ID" = $1`,
      [userId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Veli başarıyla aktif hale getirildi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
};

// Permanently delete guardian (hard delete)
export const permanentlyDeleteGuardian = async (req, res) => {
  if (!req.session.user || req.session.user.Role_ID !== 1) {
    return res.status(403).json({ error: 'Sadece adminler veli silebilir.' });
  }
  const guardianId = parseInt(req.params.id, 10);
  if (isNaN(guardianId)) {
    return res.status(400).json({ error: 'Geçersiz veli ID' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Get User_ID for the guardian
    const guardianResult = await client.query(
      `SELECT "User_ID" FROM "Guardians" WHERE "Guardian_ID" = $1`,
      [guardianId]
    );
    if (guardianResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Veli bulunamadı.' });
    }
    const userId = guardianResult.rows[0].User_ID;
    // Set Guardian_ID to NULL for all students referencing this guardian
    await client.query(`UPDATE "Students" SET "Guardian_ID" = NULL WHERE "Guardian_ID" = $1`, [guardianId]);
    // Delete from Guardians
    await client.query(`DELETE FROM "Guardians" WHERE "Guardian_ID" = $1`, [guardianId]);
    // Delete from Users
    await client.query(`DELETE FROM "Users" WHERE "User_ID" = $1`, [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Veli kalıcı olarak silindi.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  } finally {
    client.release();
  }
}; 