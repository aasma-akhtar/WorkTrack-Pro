const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'worktrack_pro',
};

async function ensureVerified() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to DB — applying verification updates...');

    // Add column if it doesn't exist
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`);

    // Mark seeded demo accounts as verified
    const demoEmails = ['admin@worktrack.com', 'manager@worktrack.com', 'employee@worktrack.com'];
    const res = await client.query(
      `UPDATE users SET is_verified = TRUE WHERE email = ANY($1::text[]) RETURNING id, email`,
      [demoEmails]
    );

    console.log(`Marked ${res.rowCount} user(s) verified:`);
    res.rows.forEach(r => console.log(` - ${r.email} (id=${r.id})`));
  } catch (err) {
    console.error('Error applying verification updates:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

ensureVerified();
