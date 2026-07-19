const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'worktrack_pro_super_secret_jwt_key_2026';

// Employee Login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token containing key user details
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        office_id: user.office_id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        office_id: user.office_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Admin registers a new employee
const register = async (req, res) => {
  const { name, email, password, role, manager_id, office_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const selectedRole = role || 'employee';
  if (!['admin', 'manager', 'employee'].includes(selectedRole)) {
    return res.status(400).json({ message: 'Invalid role type' });
  }

  try {
    // Check if email already exists
    const checkEmail = await db.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkEmail.rowCount > 0) {
      return res.status(400).json({ message: 'Email address already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, manager_id, office_id, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, name, email, role, manager_id, office_id, created_at`,
      [
        name,
        email.toLowerCase().trim(),
        passwordHash,
        selectedRole,
        manager_id || null,
        office_id || null
      ]
    );

    const newUser = result.rows[0];

    // Assign a default day shift schedule for new managers/employees so lateness can be calculated
    // Default to every weekday including weekends for created employees to support out-of-hours attendance handling.
    if (selectedRole !== 'admin') {
      const shiftResult = await db.query(
        'SELECT id FROM shifts WHERE name = $1 LIMIT 1',
        ['Regular Day Shift']
      );

      if (shiftResult.rowCount > 0) {
        const defaultShiftId = shiftResult.rows[0].id;
        const normalizedDays = Array.from(new Set([0, 1, 2, 3, 4, 5, 6]));
        const shiftInsertPromises = normalizedDays.map((day) => {
          return db.query(
            'INSERT INTO user_shifts (user_id, shift_id, day_of_week) VALUES ($1, $2, $3) ON CONFLICT (user_id, day_of_week) DO NOTHING',
            [newUser.id, defaultShiftId, day]
          );
        });
        await Promise.all(shiftInsertPromises);
      }
    }

    res.status(201).json({
      message: 'Employee registered successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get profile of logged-in user
const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, 
              m.name as manager_name, o.name as office_name
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       LEFT JOIN offices o ON u.office_id = o.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get list of employees (for drop downs, manager assignments)
const getEmployeesList = async (req, res) => {
  try {
    // If manager, only return employees under them, otherwise return all
    let queryStr = `
      SELECT u.id, u.name, u.email, u.role, u.manager_id, u.office_id, 
             m.name as manager_name, o.name as office_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN offices o ON u.office_id = o.id
    `;
    const params = [];

    if (req.user.role === 'manager') {
      queryStr += ' WHERE u.manager_id = $1 OR u.id = $1';
      params.push(req.user.id);
    }

    const result = await db.query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  getEmployeesList,
  verifyUser: async (req, res) => {
    const userId = req.params.id;
    try {
      const result = await db.query(
        'UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING id, name, email, is_verified',
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User verified successfully', user: result.rows[0] });
    } catch (error) {
      console.error('Verify user error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },
  deleteUser: async (req, res) => {
    const userId = req.params.id;
    
    // Prevent deleting the current admin
    if (req.user.id === parseInt(userId, 10)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    try {
      const result = await db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully', user: result.rows[0] });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};
