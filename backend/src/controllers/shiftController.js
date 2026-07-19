const db = require('../config/db');

// Create a new Shift (Admin only)
const createShift = async (req, res) => {
  const { name, start_time, end_time } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ message: 'Name, start_time, and end_time are required.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO shifts (name, start_time, end_time) VALUES ($1, $2, $3) RETURNING *',
      [name, start_time, end_time]
    );

    res.status(201).json({
      message: 'Shift created successfully.',
      shift: result.rows[0],
    });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Retrieve all shifts
const getAllShifts = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM shifts ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get all shifts error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Assign Shifts to an Employee (Admin / Manager only)
const assignShift = async (req, res) => {
  const { user_id, shift_id, days } = req.body; // days: Array of integers (0-6) representing weekdays

  const normalizedDays = Array.isArray(days)
    ? Array.from(new Set(days.map((day) => Number(day)).filter((day) => !Number.isNaN(day))))
    : [];

  if (!user_id || !shift_id || normalizedDays.length === 0) {
    return res.status(400).json({ message: 'User ID, Shift ID, and days (array) are required.' });
  }

  // Verify all days are valid (0-6)
  const isDaysValid = normalizedDays.every((day) => day >= 0 && day <= 6);
  if (!isDaysValid) {
    return res.status(400).json({ message: 'Days must be integers between 0 (Sunday) and 6 (Saturday).' });
  }

  try {
    // 1. Verify user exists and check permissions (Managers can only assign to their direct reports)
    const userResult = await db.query('SELECT manager_id FROM users WHERE id = $1', [user_id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    if (req.user.role === 'manager' && userResult.rows[0].manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not manage this employee.' });
    }

    // 2. Use a dedicated client for transaction-safe replace of assignments
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_shifts WHERE user_id = $1', [user_id]);

      for (const day of normalizedDays) {
        await client.query(
          'INSERT INTO user_shifts (user_id, shift_id, day_of_week) VALUES ($1, $2, $3) ON CONFLICT (user_id, day_of_week) DO NOTHING',
          [user_id, shift_id, day]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Shifts assigned successfully!' });
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

  } catch (error) {
    await db.pool.query('ROLLBACK');
    console.error('Assign shift error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get personal shifts (Employee calendar view)
const getMyShifts = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT us.id, us.day_of_week, s.name as shift_name, s.start_time, s.end_time
       FROM user_shifts us
       JOIN shifts s ON us.shift_id = s.id
       WHERE us.user_id = $1
       ORDER BY us.day_of_week ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get my shifts error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Retrieve shift calendar for overall team
const getTeamShifts = async (req, res) => {
  try {
    const requestedEmployeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    if (requestedEmployeeId !== null && Number.isNaN(requestedEmployeeId)) {
      return res.status(400).json({ message: 'employeeId must be a valid number.' });
    }

    let queryStr = `
      SELECT us.id, us.day_of_week, us.user_id, s.name as shift_name, s.start_time, s.end_time,
             u.name as employee_name, u.role as employee_role
      FROM user_shifts us
      JOIN shifts s ON us.shift_id = s.id
      JOIN users u ON us.user_id = u.id
    `;
    const params = [];

    if (requestedEmployeeId !== null) {
      // Admins can query any employee. Managers can query their own direct reports or themselves.
      if (req.user.role === 'manager' && requestedEmployeeId !== req.user.id) {
        const managerCheck = await db.query('SELECT 1 FROM users WHERE id = $1 AND manager_id = $2', [requestedEmployeeId, req.user.id]);
        if (managerCheck.rowCount === 0) {
          return res.status(403).json({ message: 'Forbidden: You do not manage this employee.' });
        }
      }

      queryStr += ' WHERE u.id = $1';
      params.push(requestedEmployeeId);
    } else if (req.user.role === 'manager') {
      queryStr += ' WHERE u.manager_id = $1 OR u.id = $1';
      params.push(req.user.id);
    }

    queryStr += ' ORDER BY u.name ASC, us.day_of_week ASC';

    const result = await db.query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get team shifts error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  createShift,
  getAllShifts,
  assignShift,
  getMyShifts,
  getTeamShifts,
};
