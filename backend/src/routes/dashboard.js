const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard metrics and summaries
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Retrieve dashboard metrics based on user role (Admin, Manager, Employee)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats compiled.
 */
router.get('/summary', authenticateJWT, dashboardController.getSummary);

module.exports = router;
