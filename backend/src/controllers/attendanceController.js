const db = require('../config/db');
const geo = require('../utils/geo');

// Helper to format time as HH:MM:SS
const formatTimeStr = (date) => {
  return date.toTimeString().split(' ')[0];
};

// Check-in Attendance
const checkIn = async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // Accept simulated IP and GPS coordinates from the Developer Simulator
  const clientIp = req.body.simulatedIp || req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
  const { latitude, longitude, bypassVerification } = req.body;

  try {
    // 1. Fetch user's office configurations and assigned shift
    const userResult = await db.query(
      `SELECT u.office_id, o.name as office_name, o.ip_whitelist, o.latitude as office_lat, 
              o.longitude as office_lng, o.radius_meters
       FROM users u
       LEFT JOIN offices o ON u.office_id = o.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0 || !userResult.rows[0].office_id) {
      return res.status(400).json({ message: 'User is not assigned to any office.' });
    }

    const office = userResult.rows[0];

    // 2. Check IP Whitelisting (if not explicitly bypassed in simulator)
    if (!bypassVerification) {
      // Clean whitelisted IPs list
      const allowedIPs = office.ip_whitelist.split(',').map(ip => ip.trim());
      const isIpAllowed = allowedIPs.some(allowedIp => {
        return clientIp === allowedIp || 
               clientIp.includes(allowedIp) || 
               allowedIp === 'localhost' && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1');
      });

      if (!isIpAllowed) {
        return res.status(403).json({
          message: `Forbidden: Unauthorized network. Attendance marking restricted from IP: ${clientIp}. Please connect to office Wi-Fi.`
        });
      }
    }

    // 3. Check Geo-Location Verification (if not explicitly bypassed in simulator)
    if (!bypassVerification) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'GPS coordinates (latitude/longitude) are required for check-in.' });
      }

      const distance = geo.getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        office.office_lat,
        office.office_lng
      );

      if (distance > office.radius_meters) {
        return res.status(403).json({
          message: `Forbidden: Out of range. You are ${Math.round(distance)}m away from office location (allowed radius: ${office.radius_meters}m).`
        });
      }
    }

    // 4. Check if already checked in today
    const checkDuplicate = await db.query(
      'SELECT id FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (checkDuplicate.rowCount > 0) {
      return res.status(400).json({ message: 'You have already checked in today!' });
    }

    // 5. Shift scheduling and status calculation
    // Get shift for current day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date().getDay();
    const shiftResult = await db.query(
      `SELECT s.start_time, s.end_time, s.name as shift_name
       FROM user_shifts us
       JOIN shifts s ON us.shift_id = s.id
       WHERE us.user_id = $1 AND us.day_of_week = $2`,
      [userId, dayOfWeek]
    );

    let checkInStatus = bypassVerification ? 'simulated' : 'verified';
    let status = 'present';

    if (shiftResult.rowCount > 0) {
      const shift = shiftResult.rows[0];
      const nowTime = new Date();
      
      // Parse shift start time (HH:MM:SS)
      const [sh, sm, ss] = shift.start_time.split(':').map(Number);
      const shiftStart = new Date();
      shiftStart.setHours(sh, sm, ss, 0);

      // Late grace period: 15 minutes after shift starts
      const lateLimit = new Date(shiftStart.getTime() + 15 * 60 * 1000);

      if (nowTime > lateLimit) {
        status = 'late';
      }
    } else {
      // If no shift is scheduled, check-in is allowed but status defaults to present
      checkInStatus += ' (unscheduled)';
    }

    const checkInTime = formatTimeStr(new Date());

    // Insert attendance log
    const insertResult = await db.query(
      `INSERT INTO attendance (user_id, date, check_in_time, check_in_ip, check_in_lat, check_in_lng, status, check_in_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        today,
        checkInTime,
        clientIp,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        status,
        checkInStatus
      ]
    );

    res.status(201).json({
      message: `Checked in successfully as ${status.toUpperCase()}!`,
      attendance: insertResult.rows[0],
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Check-out Attendance
const checkOut = async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // Accept simulated IP and GPS coordinates from the Developer Simulator
  const clientIp = req.body.simulatedIp || req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
  const { latitude, longitude, bypassVerification } = req.body;

  try {
    // 1. Fetch check-in entry
    const attendanceResult = await db.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (attendanceResult.rowCount === 0) {
      return res.status(400).json({ message: 'Cannot check out: No active check-in found for today.' });
    }

    const attendanceEntry = attendanceResult.rows[0];

    if (attendanceEntry.check_out_time) {
      return res.status(400).json({ message: 'You have already checked out today!' });
    }

    // 2. Fetch office whitelists for validation
    const userResult = await db.query(
      `SELECT u.office_id, o.ip_whitelist, o.latitude as office_lat, o.longitude as office_lng, o.radius_meters
       FROM users u
       LEFT JOIN offices o ON u.office_id = o.id
       WHERE u.id = $1`,
      [userId]
    );

    const office = userResult.rows[0];

    // Check IP Whitelisting (if not explicitly bypassed)
    if (!bypassVerification && office) {
      const allowedIPs = office.ip_whitelist.split(',').map(ip => ip.trim());
      const isIpAllowed = allowedIPs.some(allowedIp => {
        return clientIp === allowedIp || 
               clientIp.includes(allowedIp) ||
               allowedIp === 'localhost' && (clientIp === '127.0.0.1' || clientIp === '::1');
      });

      if (!isIpAllowed) {
        return res.status(403).json({
          message: `Forbidden: Unauthorized network. Check-out restricted from IP: ${clientIp}.`
        });
      }
    }

    // Check Geo-location (if not explicitly bypassed)
    if (!bypassVerification && office) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'GPS coordinates are required for check-out.' });
      }

      const distance = geo.getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        office.office_lat,
        office.office_lng
      );

      if (distance > office.radius_meters) {
        return res.status(403).json({
          message: `Forbidden: Out of range. You are ${Math.round(distance)}m away from office location.`
        });
      }
    }

    const checkOutTime = formatTimeStr(new Date());
    const checkOutStatus = bypassVerification ? 'simulated' : 'verified';

    // Update check-out log
    const updateResult = await db.query(
      `UPDATE attendance
       SET check_out_time = $1, check_out_ip = $2, check_out_lat = $3, check_out_lng = $4, check_out_status = $5
       WHERE id = $6
       RETURNING *`,
      [
        checkOutTime,
        clientIp,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        checkOutStatus,
        attendanceEntry.id
      ]
    );

    res.json({
      message: 'Checked out successfully!',
      attendance: updateResult.rows[0],
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Retrieve Logged-in User's Attendance History
const getMyHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT id, date, check_in_time, check_out_time, check_in_ip, status, check_in_status
       FROM attendance
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Retrieve Overall Team Attendance logs (Admin/Manager only)
const getTeamHistory = async (req, res) => {
  const { startDate, endDate, employeeId } = req.query;

  try {
    let queryStr = `
      SELECT a.id, a.date, a.check_in_time, a.check_out_time, a.status, 
             a.check_in_ip, a.check_in_status, u.name as employee_name, u.email as employee_email
      FROM attendance a
      JOIN users u ON a.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    // Roles filtration: Manager sees their team; Admin sees all
    if (req.user.role === 'manager') {
      conditions.push(`(u.manager_id = $${params.length + 1} OR u.id = $${params.length + 1})`);
      params.push(req.user.id);
    }

    if (employeeId) {
      conditions.push(`a.user_id = $${params.length + 1}`);
      params.push(employeeId);
    }

    if (startDate) {
      conditions.push(`a.date >= $${params.length + 1}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`a.date <= $${params.length + 1}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY a.date DESC, a.check_in_time DESC';

    const result = await db.query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get team history error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyHistory,
  getTeamHistory,
};
