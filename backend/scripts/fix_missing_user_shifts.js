const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'worktrack_pro'
  });

  await client.connect();

  try {
    const shiftRes = await client.query("SELECT id FROM shifts WHERE name = $1 LIMIT 1", ['Regular Day Shift']);
    if (shiftRes.rowCount === 0) {
      console.error('Regular Day Shift template not found. Aborting.');
      return;
    }

    const defaultShiftId = shiftRes.rows[0].id;

    const usersRes = await client.query(
      `SELECT id, name, role FROM users WHERE role != 'admin'`
    );

    for (const user of usersRes.rows) {
      const assignedRes = await client.query(
        `SELECT day_of_week FROM user_shifts WHERE user_id = $1 ORDER BY day_of_week`,
        [user.id]
      );

      const assignedDays = new Set(assignedRes.rows.map((r) => r.day_of_week));
      const missingDays = [];

      for (let day = 0; day <= 6; day += 1) {
        if (!assignedDays.has(day)) missingDays.push(day);
      }

      if (missingDays.length > 0) {
        console.log(`Patching ${user.name} (id=${user.id}) missing days: ${missingDays.join(', ')}`);
        for (const day of missingDays) {
          await client.query(
            `INSERT INTO user_shifts (user_id, shift_id, day_of_week) VALUES ($1, $2, $3) ON CONFLICT (user_id, day_of_week) DO NOTHING`,
            [user.id, defaultShiftId, day]
          );
        }
      }
    }

    console.log('Missing shift day patch complete.');
  } catch (error) {
    console.error('Error patching missing shift days:', error);
  } finally {
    await client.end();
  }
})();