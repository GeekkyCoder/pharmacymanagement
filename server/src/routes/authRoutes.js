const express = require('express');
const router = express.Router();
const { registerAdmin, login, createEmployee, listEmployees, updateEmployee, toggleEmployeeActive, resetEmployeePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/employees', auth, requireRole('admin'), createEmployee);
router.get('/employees', auth, requireRole('admin'), listEmployees);
router.patch('/employees/:id', auth, requireRole('admin'), updateEmployee);
router.patch('/employees/:id/toggle-active', auth, requireRole('admin'), toggleEmployeeActive);
router.post('/employees/:id/reset-password', auth, requireRole('admin'), resetEmployeePassword);

module.exports = router;
