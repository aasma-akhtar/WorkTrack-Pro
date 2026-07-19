const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'worktrack_pro'
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const users = await client.query('SELECT id, name, email, role FROM users ORDER BY id');
    console.log('Users:', users.rows);

    const admin = await client.query('SELECT id, email, role, password_hash FROM users WHERE email = $1', ['admin@worktrack.com']);
    console.log('Admin lookup rowCount:', admin.rowCount);
    console.log('Admin row:', admin.rows);

    if (admin.rows[0]) {
      const hash = admin.rows[0].password_hash;
      for (const candidate of ['adminpassword', 'admin123', 'Admin123', 'password', 'worktrack']) {
        const ok = await require('bcryptjs').compare(candidate, hash);
        console.log(`compare ${candidate}:`, ok);
      }
    }
  } catch (err) {
    console.error('DB error:', err);
  } finally {
    await client.end();
  }
})();