const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Attendance PDF/Excel reports exporter
 */

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Export monthly attendance report as PDF or Excel
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: The month to export (YYYY-MM)
 *         example: '2026-06'
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, excel]
 *         description: Target export format (pdf or excel)
 *         example: 'pdf'
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: Specific employee ID (Admin/Manager only, defaults to current user)
 *     responses:
 *       200:
 *         description: File downloaded successfully.
 *       400:
 *         description: Missing required fields.
 *       403:
 *         description: Forbidden. Checked constraints.
 */
router.get('/export', authenticateJWT, reportController.exportMonthlyReport);

module.exports = router;
