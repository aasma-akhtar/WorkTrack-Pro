const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Employee sign-in and account registration
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user & return JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: employee@worktrack.com
 *               password:
 *                 type: string
 *                 example: employeepassword
 *     responses:
 *       200:
 *         description: Login successful. Returns user metadata and Bearer JWT.
 *       401:
 *         description: Invalid email or password.
 *       500:
 *         description: Internal Server Error.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new employee account (Admin only)
 *     tags: [Authentication]
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
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: Alex Employee
 *               email:
 *                 type: string
 *                 example: employee2@worktrack.com
 *               password:
 *                 type: string
 *                 example: employeepassword
 *               role:
 *                 type: string
 *                 enum: [admin, manager, employee]
 *                 example: employee
 *               manager_id:
 *                 type: integer
 *                 example: 2
 *               office_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Account successfully registered.
 *       400:
 *         description: Bad request. Email already registered.
 *       401:
 *         description: Unauthorized. Missing JWT token.
 *       403:
 *         description: Forbidden. Requires Admin role.
 */
router.post('/register', authenticateJWT, requireRole(['admin']), authController.register);

// Admin verifies a user's email/account
router.post('/verify/:id', authenticateJWT, requireRole(['admin']), authController.verifyUser);

// Admin deletes a user account
router.delete('/users/:id', authenticateJWT, requireRole(['admin']), authController.deleteUser);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get profile of logged-in user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data retrieved.
 */
router.get('/profile', authenticateJWT, authController.getProfile);

/**
 * @swagger
 * /api/auth/employees:
 *   get:
 *     summary: Get lists of employees (Manager views reportees, Admin views all)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee list retrieved.
 */
router.get('/employees', authenticateJWT, authController.getEmployeesList);

module.exports = router;
