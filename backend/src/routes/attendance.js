const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance checking and history logs
 */

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Log employee check-in (validates IP and geofence location)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 28.6139
 *               longitude:
 *                 type: number
 *                 example: 77.2090
 *               simulatedIp:
 *                 type: string
 *                 example: 192.168.1.50
 *               bypassVerification:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Checked in successfully.
 *       403:
 *         description: Forbidden. Network IP outside whitelist or GPS outside office radius.
 */
router.post('/check-in', authenticateJWT, attendanceController.checkIn);

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Log employee check-out (validates IP and geofence location)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 28.6139
 *               longitude:
 *                 type: number
 *                 example: 77.2090
 *               simulatedIp:
 *                 type: string
 *                 example: 192.168.1.50
 *               bypassVerification:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Checked out successfully.
 */
router.post('/check-out', authenticateJWT, attendanceController.checkOut);

/**
 * @swagger
 * /api/attendance/my-history:
 *   get:
 *     summary: Get logged-in user's attendance log history (last 30 entries)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance history retrieved.
 */
router.get('/my-history', authenticateJWT, attendanceController.getMyHistory);

/**
 * @swagger
 * /api/attendance/team-history:
 *   get:
 *     summary: Get overall team attendance logs (Admin/Manager only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter YYYY-MM-DD
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter YYYY-MM-DD
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: Filter by specific employee ID
 *     responses:
 *       200:
 *         description: Team logs retrieved.
 */
router.get('/team-history', authenticateJWT, requireRole(['admin', 'manager']), attendanceController.getTeamHistory);

module.exports = router;
