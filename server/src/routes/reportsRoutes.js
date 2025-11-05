const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { salesReport, dashboardStats } = require('../controllers/reportsController');
const requireRole = require('../middleware/role');

router.use(auth);
router.get('/sales', salesReport); // both admin & employee view (admin oversight)
router.get('/dashboard', requireRole('admin'), dashboardStats); // admin-only aggregated dashboard stats

module.exports = router;
