const db = require('../config/db');

// Get Dashboard Summary stats based on User Role (Admin, Manager, Employee)
const getSummary = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();

  try {
    if (role === 'admin') {
      // 1. ADMIN METRICS
      const employeesCount = await db.query("SELECT COUNT(*) FROM users WHERE role != 'admin'");
      const officesCount = await db.query("SELECT COUNT(*) FROM offices");
      const activeLeaves = await db.query("SELECT COUNT(*) FROM leaves WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date");
      const pendingLeaves = await db.query("SELECT COUNT(*) FROM leaves WHERE status = 'pending'");
      const checkedInToday = await db.query("SELECT COUNT(*) FROM attendance WHERE date = $1", [today]);
      
      // Attendance rates for last 7 days for overall chart
      const chartData = await db.query(`
        SELECT date, 
               COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
               COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
               COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_day
        FROM attendance
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY date
        ORDER BY date ASC
      `);

      return res.json({
        totalEmployees: parseInt(employeesCount.rows[0].count, 10),
        totalOffices: parseInt(officesCount.rows[0].count, 10),
        activeLeaves: parseInt(activeLeaves.rows[0].count, 10),
        pendingLeaves: parseInt(pendingLeaves.rows[0].count, 10),
        checkedInToday: parseInt(checkedInToday.rows[0].count, 10),
        chart: chartData.rows,
      });

    } else if (role === 'manager') {
      // 2. MANAGER METRICS (Team focused)
      const teamCount = await db.query("SELECT COUNT(*) FROM users WHERE manager_id = $1", [userId]);
      
      const teamCheckedIn = await db.query(
        `SELECT COUNT(*) FROM attendance a
         JOIN users u ON a.user_id = u.id
         WHERE u.manager_id = $1 AND a.date = $2`,
        [userId, today]
      );

      const teamPendingLeaves = await db.query(
        `SELECT COUNT(*) FROM leaves l
         JOIN users u ON l.user_id = u.id
         WHERE u.manager_id = $1 AND l.status = 'pending'`,
        [userId]
      );

      // List of currently checked-in team members today
      const activeTeamMembers = await db.query(
        `SELECT u.name, a.check_in_time, a.check_out_time, a.status
         FROM attendance a
         JOIN users u ON a.user_id = u.id
         WHERE u.manager_id = $1 AND a.date = $2`,
        [userId, today]
      );

      return res.json({
        teamSize: parseInt(teamCount.rows[0].count, 10),
        teamCheckedInToday: parseInt(teamCheckedIn.rows[0].count, 10),
        teamPendingLeaves: parseInt(teamPendingLeaves.rows[0].count, 10),
        activeTeam: activeTeamMembers.rows,
      });

    } else {
      // 3. EMPLOYEE METRICS (Personal focused)
      // Check if checked in today
      const todayAttendance = await db.query(
        "SELECT check_in_time, check_out_time, status FROM attendance WHERE user_id = $1 AND date = $2",
        [userId, today]
      );

      // Current shift details for today
      const todayShift = await db.query(
        `SELECT s.name as shift_name, s.start_time, s.end_time
         FROM user_shifts us
         JOIN shifts s ON us.shift_id = s.id
         WHERE us.user_id = $1 AND us.day_of_week = $2`,
        [userId, dayOfWeek]
      );

      // Total working days this month
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const monthlyAttendance = await db.query(
        `SELECT COUNT(*) as total_days,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_day
         FROM attendance
         WHERE user_id = $1 AND date::text LIKE $2`,
        [userId, `${currentMonth}%`]
      );

      // Approved leaves balance
      const approvedLeavesCount = await db.query(
        "SELECT COUNT(*) FROM leaves WHERE user_id = $1 AND status = 'approved'",
        [userId]
      );

      return res.json({
        todayStatus: todayAttendance.rowCount > 0 ? {
          checkedIn: true,
          checkInTime: todayAttendance.rows[0].check_in_time,
          checkOutTime: todayAttendance.rows[0].check_out_time,
          status: todayAttendance.rows[0].status,
        } : { checkedIn: false },
        shift: todayShift.rowCount > 0 ? todayShift.rows[0] : null,
        monthlyStats: {
          total: parseInt(monthlyAttendance.rows[0].total_days || 0, 10),
          present: parseInt(monthlyAttendance.rows[0].present || 0, 10),
          late: parseInt(monthlyAttendance.rows[0].late || 0, 10),
          halfDay: parseInt(monthlyAttendance.rows[0].half_day || 0, 10),
        },
        leavesTaken: parseInt(approvedLeavesCount.rows[0].count || 0, 10),
      });
    }
  } catch (error) {
    console.error('Get summary dashboard error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  getSummary,
};
