const db = require('../config/db');
const emailService = require('../utils/email');

// Apply for leave
const applyLeave = async (req, res) => {
  const userId = req.user.id;
  const { leave_type, start_date, end_date, reason } = req.body;

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ message: 'All fields are required (leave_type, start_date, end_date, reason).' });
  }

  try {
    // 1. Double check leave type
    if (!['annual', 'sick', 'unpaid', 'study', 'maternity'].includes(leave_type)) {
      return res.status(400).json({ message: 'Invalid leave type.' });
    }

    // 2. Insert leave request
    const insertResult = await db.query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [userId, leave_type, start_date, end_date, reason]
    );

    const leaveRequest = insertResult.rows[0];

    // 3. Notify manager via email
    const employeeRes = await db.query(
      `SELECT u.name as employee_name, m.email as manager_email, m.name as manager_name
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = $1`,
      [userId]
    );

    if (employeeRes.rowCount > 0 && employeeRes.rows[0].manager_email) {
      const { employee_name, manager_email, manager_name } = employeeRes.rows[0];
      const emailSubject = `New Leave Request - ${employee_name}`;
      const emailBody = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">WorkTrack Pro Notifications</h2>
          <p>Hello <strong>${manager_name}</strong>,</p>
          <p>You have received a new leave request that requires your review:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 150px;">Employee:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${employee_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Leave Type:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${leave_type.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Start Date:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${start_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">End Date:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${end_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Reason:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${reason}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Please log in to your WorkTrack Pro dashboard to approve or reject this request.</p>
          <br/>
          <p style="font-size: 11px; color: #888;">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      `;
      // Send asynchronously in background to not block response
      emailService.sendNotificationEmail(manager_email, emailSubject, emailBody);
    }

    res.status(201).json({
      message: 'Leave request submitted successfully.',
      leave: leaveRequest,
    });

  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Retrieve logged-in user's leaves
const getMyLeaves = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.comments, 
              l.created_at, u.name as reviewer_name
       FROM leaves l
       LEFT JOIN users u ON l.approved_by = u.id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get pending leaves (For managers / admins)
const getPendingLeaves = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    let queryStr = `
      SELECT l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
             u.name as employee_name, u.email as employee_email
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'pending'
    `;
    const params = [];

    // Managers only see pending leaves of employees they manage
    if (role === 'manager') {
      queryStr += ' AND u.manager_id = $1';
      params.push(userId);
    }

    queryStr += ' ORDER BY l.created_at ASC';

    const result = await db.query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending leaves error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Review Leave Request (Approve/Reject)
const reviewLeave = async (req, res) => {
  const reviewerId = req.user.id;
  const leaveId = req.params.id;
  const { status, comments } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be either approved or rejected.' });
  }

  try {
    // 1. Fetch the leave details and check permissions
    const checkLeave = await db.query(
      `SELECT l.*, u.name as employee_name, u.email as employee_email, u.manager_id
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [leaveId]
    );

    if (checkLeave.rowCount === 0) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    const leave = checkLeave.rows[0];

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Leave has already been reviewed (${leave.status}).` });
    }

    // Managers can only review leaves of their direct reports
    if (req.user.role === 'manager' && leave.manager_id !== reviewerId) {
      return res.status(403).json({ message: 'Forbidden: You do not manage this employee.' });
    }

    // 2. Update leave status
    const updateResult = await db.query(
      `UPDATE leaves
       SET status = $1, approved_by = $2, comments = $3
       WHERE id = $4
       RETURNING *`,
      [status, reviewerId, comments || null, leaveId]
    );

    // 3. Send notification email to the employee
    const reviewerRes = await db.query('SELECT name FROM users WHERE id = $1', [reviewerId]);
    const reviewerName = reviewerRes.rows[0].name;

    const emailSubject = `Leave Request ${status.toUpperCase()} - WorkTrack Pro`;
    const emailBody = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">WorkTrack Pro Notifications</h2>
        <p>Hello <strong>${leave.employee_name}</strong>,</p>
        <p>Your leave request has been reviewed by your manager, <strong>${reviewerName}</strong>.</p>
        <div style="background-color: ${status === 'approved' ? '#ecfdf5' : '#fef2f2'}; border-left: 5px solid ${status === 'approved' ? '#10b981' : '#ef4444'}; padding: 15px; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold; color: ${status === 'approved' ? '#065f46' : '#991b1b'};">
            Decision: ${status.toUpperCase()}
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13px;">
            <strong>Manager Comments:</strong> ${comments || 'No comments left.'}
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 150px;">Leave Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${leave.leave_type.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Start Date:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${leave.start_date.toISOString().split('T')[0]}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">End Date:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${leave.end_date.toISOString().split('T')[0]}</td>
          </tr>
        </table>
        <br/>
        <p style="font-size: 11px; color: #888;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    `;

    emailService.sendNotificationEmail(leave.employee_email, emailSubject, emailBody);

    res.json({
      message: `Leave request has been ${status}.`,
      leave: updateResult.rows[0],
    });

  } catch (error) {
    console.error('Review leave error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  reviewLeave,
};
