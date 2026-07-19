const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Shifts
 *   description: Shift schedules and assignments
 */

/**
 * @swagger
 * /api/shifts:
 *   post:
 *     summary: Create a new shift template (Admin only)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - start_time
 *               - end_time
 *             properties:
 *               name:
 *                 type: string
 *                 example: Afternoon shift
 *               start_time:
 *                 type: string
 *                 example: '14:00:00'
 *               end_time:
 *                 type: string
 *                 example: '22:00:00'
 *     responses:
 *       201:
 *         description: Shift template created.
 */
router.post('/', authenticateJWT, requireRole(['admin']), shiftController.createShift);

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: Get all shift templates
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shift templates list retrieved.
 */
router.get('/', authenticateJWT, shiftController.getAllShifts);

/**
 * @swagger
 * /api/shifts/assign:
 *   post:
 *     summary: Assign shifts to an employee (Admin/Manager only)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - shift_id
 *               - days
 *             properties:
 *               user_id:
 *                 type: integer
 *               shift_id:
 *                 type: integer
 *               days:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Shift assigned.
 */
router.post('/assign', authenticateJWT, requireRole(['admin', 'manager']), shiftController.assignShift);

/**
 * @swagger
 * /api/shifts/my-shifts:
 *   get:
 *     summary: Get logged-in user's shift calendar schedule
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Schedule retrieved.
 */
router.get('/my-shifts', authenticateJWT, shiftController.getMyShifts);

/**
 * @swagger
 * /api/shifts/team-shifts:
 *   get:
 *     summary: Retrieve shift calendar for overall team (Admin/Manager only)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team shift calendar retrieved.
 */
router.get('/team-shifts', authenticateJWT, requireRole(['admin', 'manager']), shiftController.getTeamShifts);

module.exports = router;
