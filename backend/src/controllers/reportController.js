const db = require('../config/db');
const pdfGenerator = require('../utils/pdfGenerator');
const excelGenerator = require('../utils/excelGenerator');

const exportMonthlyReport = async (req, res) => {
  const { month, format } = req.query; // month: YYYY-MM, format: pdf | excel
  let employeeId = req.query.employeeId;

  if (!month) {
    return res.status(400).json({ message: 'Month query parameter (YYYY-MM) is required.' });
  }

  const exportFormat = format || 'pdf';
  if (!['pdf', 'excel'].includes(exportFormat)) {
    return res.status(400).json({ message: "Invalid format. Use either 'pdf' or 'excel'." });
  }

  // Permissions check: Employee can only fetch their own report
  if (req.user.role === 'employee') {
    employeeId = req.user.id;
  } else if (!employeeId) {
    // If Admin/Manager requests reports without employeeId, default to their own
    employeeId = req.user.id;
  }

  try {
    // 1. Get employee info
    const userResult = await db.query(
      `SELECT name, email, manager_id FROM users WHERE id = $1`,
      [employeeId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const employee = userResult.rows[0];

    // Manager validation check: Manager can only export reports for their own direct reports
    if (req.user.role === 'manager' && employee.manager_id !== req.user.id && employeeId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not manage this employee.' });
    }

    // 2. Fetch attendance logs for specified month (e.g. date starts with YYYY-MM)
    const startDate = `${month}-01`;
    // Find last day of month
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${month}-${lastDay}`;

    const logsResult = await db.query(
      `SELECT date, check_in_time, check_out_time, status, check_in_ip, check_in_status
       FROM attendance
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [employeeId, startDate, endDate]
    );

    const records = logsResult.rows;

    // 3. Calculate summary metrics
    const summary = {
      totalDays: records.length,
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
    };

    // 4. Trigger download formats
    const monthYear = `${m}/${year}`;
    if (exportFormat === 'pdf') {
      pdfGenerator.generateMonthlyPDF(res, employee.name, monthYear, records, summary);
    } else {
      await excelGenerator.generateMonthlyExcel(res, employee.name, monthYear, records, summary);
    }

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  exportMonthlyReport,
};
