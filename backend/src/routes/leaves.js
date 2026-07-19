const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Leaves
 *   description: Leave applications and approvals workflow
 */

/**
 * @swagger
 * /api/leaves/apply:
 *   post:
 *     summary: Apply for a leave request
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leave_type
 *               - start_date
 *               - end_date
 *               - reason
 *             properties:
 *               leave_type:
 *                 type: string
 *                 enum: [annual, sick, unpaid, study, maternity]
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-07-01
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-07-03
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request submitted.
 */
router.post('/apply', authenticateJWT, leaveController.applyLeave);

/**
 * @swagger
 * /api/leaves/my-leaves:
 *   get:
 *     summary: Get logged-in user's leave requests history
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal leaves list retrieved.
 */
router.get('/my-leaves', authenticateJWT, leaveController.getMyLeaves);

/**
 * @swagger
 * /api/leaves/pending:
 *   get:
 *     summary: Get lists of pending leave applications (Admin/Manager only)
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending list retrieved.
 */
router.get('/pending', authenticateJWT, requireRole(['admin', 'manager']), leaveController.getPendingLeaves);

/**
 * @swagger
 * /api/leaves/review/{id}:
 *   put:
 *     summary: Review leave request (Approve or Reject)
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review logged.
 */
router.put('/review/:id', authenticateJWT, requireRole(['admin', 'manager']), leaveController.reviewLeave);

module.exports = router;
