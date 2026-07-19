const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
};

async function initializeDatabase() {
  console.log('Starting database initialization...');

  // Step 1: Connect to default 'postgres' database to check/create the target database
  const client = new Client({ ...dbConfig, database: 'postgres' });
  try {
    await client.connect();
    
    // Check if target database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'worktrack_pro']
    );

    if (dbCheck.rowCount === 0) {
      console.log(`Database '${process.env.DB_NAME || 'worktrack_pro'}' does not exist. Creating it...`);
      // CREATE DATABASE cannot run inside a transaction blocks
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'worktrack_pro'}`);
      console.log(`Database '${process.env.DB_NAME || 'worktrack_pro'}' created successfully.`);
    } else {
      console.log(`Database '${process.env.DB_NAME || 'worktrack_pro'}' already exists.`);
    }
  } catch (error) {
    console.error('Error connecting to default postgres database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Step 2: Connect to the newly created/existing 'worktrack_pro' database to initialize tables
  const targetClient = new Client({
    ...dbConfig,
    database: process.env.DB_NAME || 'worktrack_pro',
  });

  try {
    await targetClient.connect();
    console.log('Connected to target database. Creating schema...');

    // Drop tables if they exist
    await targetClient.query(`
      DROP TABLE IF EXISTS leaves CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS user_shifts CASCADE;
      DROP TABLE IF EXISTS shifts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS offices CASCADE;
    `);

    // Create Offices Table
    await targetClient.query(`
      CREATE TABLE offices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ip_whitelist TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius_meters INTEGER DEFAULT 200,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Users Table
    await targetClient.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
        manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        office_id INTEGER REFERENCES offices(id) ON DELETE SET NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Shifts Table
    await targetClient.query(`
      CREATE TABLE shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create User Shifts Table
    await targetClient.query(`
      CREATE TABLE user_shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, day_of_week)
      );
    `);

    // Create Attendance Table
    await targetClient.query(`
      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in_time TIME NOT NULL,
        check_out_time TIME,
        check_in_ip VARCHAR(45) NOT NULL,
        check_out_ip VARCHAR(45),
        check_in_lat DOUBLE PRECISION,
        check_in_lng DOUBLE PRECISION,
        check_out_lat DOUBLE PRECISION,
        check_out_lng DOUBLE PRECISION,
        status VARCHAR(20) CHECK (status IN ('present', 'late', 'half_day', 'absent')) DEFAULT 'present',
        check_in_status VARCHAR(50) DEFAULT 'verified',
        check_out_status VARCHAR(50) DEFAULT 'verified',
        UNIQUE(user_id, date)
      );
    `);

    // Create Leaves Table
    await targetClient.query(`
      CREATE TABLE leaves (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'study', 'maternity')) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables created. Seeding initial data...');

    // Seed Office
    const officeRes = await targetClient.query(`
      INSERT INTO offices (name, ip_whitelist, latitude, longitude, radius_meters)
      VALUES ('Headquarters', '127.0.0.1,192.168.1.50,::1,localhost,::ffff:127.0.0.1', 28.6139, 77.2090, 200)
      RETURNING id;
    `);
    const officeId = officeRes.rows[0].id;

    // Seed Shifts
    const dayShiftRes = await targetClient.query(`
      INSERT INTO shifts (name, start_time, end_time)
      VALUES ('Regular Day Shift', '09:00:00', '17:00:00')
      RETURNING id;
    `);
    const dayShiftId = dayShiftRes.rows[0].id;

    await targetClient.query(`
      INSERT INTO shifts (name, start_time, end_time)
      VALUES ('Night Shift', '22:00:00', '06:00:00');
    `);

    // Hash passwords
    const adminPassHash = bcrypt.hashSync('adminpassword', 10);
    const managerPassHash = bcrypt.hashSync('managerpassword', 10);
    const employeePassHash = bcrypt.hashSync('employeepassword', 10);

    // Seed Admin
    await targetClient.query(`
      INSERT INTO users (name, email, password_hash, role, office_id, is_verified)
      VALUES ('Global Admin', 'admin@worktrack.com', $1, 'admin', $2, TRUE)
    `, [adminPassHash, officeId]);

    // Seed Manager
    const managerRes = await targetClient.query(`
      INSERT INTO users (name, email, password_hash, role, office_id, is_verified)
      VALUES ('Sarah Manager', 'manager@worktrack.com', $1, 'manager', $2, TRUE)
      RETURNING id;
    `, [managerPassHash, officeId]);
    const managerId = managerRes.rows[0].id;

    // Seed Employee
    const employeeRes = await targetClient.query(`
      INSERT INTO users (name, email, password_hash, role, manager_id, office_id, is_verified)
      VALUES ('Alex Employee', 'employee@worktrack.com', $1, 'employee', $2, $3, TRUE)
      RETURNING id;
    `, [employeePassHash, managerId, officeId]);
    const employeeId = employeeRes.rows[0].id;

    // Assign shifts (Monday to Friday, day_of_week 1 to 5)
    for (let day = 1; day <= 5; day++) {
      await targetClient.query(`
        INSERT INTO user_shifts (user_id, shift_id, day_of_week)
        VALUES ($1, $2, $3)
      `, [employeeId, dayShiftId, day]);

      await targetClient.query(`
        INSERT INTO user_shifts (user_id, shift_id, day_of_week)
        VALUES ($1, $2, $3)
      `, [managerId, dayShiftId, day]);
    }

    // Seed past attendance logs for the employee (last 15 days)
    console.log('Seeding attendance history logs...');
    const now = new Date();
    let seededCount = 0;
    for (let i = 20; i >= 1; i--) {
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - i);
      const dayOfWeek = pastDate.getDay();

      // Only seed on weekdays (Monday=1 to Friday=5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Randomize status and times
        let checkInTime = '08:52:00';
        let checkOutTime = '17:05:00';
        let status = 'present';

        const rand = Math.random();
        if (rand < 0.15) {
          checkInTime = '09:23:00'; // Late
          status = 'late';
        } else if (rand < 0.22) {
          checkInTime = '09:45:00'; // Late / Half day
          checkOutTime = '13:00:00';
          status = 'half_day';
        }

        // Format date string YYYY-MM-DD
        const dateStr = pastDate.toISOString().split('T')[0];

        await targetClient.query(`
          INSERT INTO attendance (user_id, date, check_in_time, check_out_time, check_in_ip, check_out_ip, check_in_lat, check_in_lng, status, check_in_status)
          VALUES ($1, $2, $3, $4, '192.168.1.50', '192.168.1.50', 28.6139, 77.2090, $5, 'verified')
        `, [employeeId, dateStr, checkInTime, checkOutTime, status]);

        seededCount++;
      }
    }
    console.log(`Seeded ${seededCount} attendance logs.`);

    // Seed Leaves
    const today = new Date();
    
    // Approved leave in the past
    const start1 = new Date(); start1.setDate(today.getDate() - 10);
    const end1 = new Date(); end1.setDate(today.getDate() - 8);
    await targetClient.query(`
      INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, approved_by, comments)
      VALUES ($1, 'sick', $2, $3, 'Recovering from severe flu', 'approved', $4, 'Take care, get well soon!')
    `, [employeeId, start1.toISOString().split('T')[0], end1.toISOString().split('T')[0], managerId]);

    // Pending leave in the future
    const start2 = new Date(); start2.setDate(today.getDate() + 5);
    const end2 = new Date(); end2.setDate(today.getDate() + 7);
    await targetClient.query(`
      INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status)
      VALUES ($1, 'annual', $2, $3, 'Family trip out of town')
    `, [employeeId, start2.toISOString().split('T')[0], end2.toISOString().split('T')[0]]);

    // Rejected leave in the past
    const start3 = new Date(); start3.setDate(today.getDate() - 15);
    const end3 = new Date(); end3.setDate(today.getDate() - 14);
    await targetClient.query(`
      INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, approved_by, comments)
      VALUES ($1, 'unpaid', $2, $3, 'Personal errand during crucial release', 'rejected', $4, 'Sorry, we need all hands on deck this week due to project releases.')
    `, [employeeId, start3.toISOString().split('T')[0], end3.toISOString().split('T')[0], managerId]);

    console.log('Leave requests seeded.');
    console.log('Database initialization completed successfully.');

  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

initializeDatabase();
