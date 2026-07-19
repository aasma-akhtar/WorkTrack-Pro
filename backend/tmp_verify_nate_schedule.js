const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '123456', database: 'worktrack_pro' });
  await client.connect();
  try {
    const today = new Date().getDay();
    const query = `SELECT u.id,u.name,u.email,u.role,u.office_id,us.day_of_week,s.name as shift_name,s.start_time,s.end_time FROM users u LEFT JOIN user_shifts us ON us.user_id = u.id LEFT JOIN shifts s ON us.shift_id = s.id WHERE u.name ILIKE $1 OR u.email ILIKE $1 ORDER BY us.day_of_week`;
    const res = await client.query(query, ['%nate%']);
    console.log(JSON.stringify({ today, rows: res.rows }, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();