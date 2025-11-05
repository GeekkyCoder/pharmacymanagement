const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { createSale, cancelSale, retrySale, getSale, listSales } = require('../controllers/salesController');

router.use(auth);

router.post('/', requireRole('employee'), createSale);
router.post('/:id/cancel', requireRole('employee'), cancelSale);
router.post('/:originalId/retry', requireRole('employee'), retrySale);
router.get('/:id', getSale);
router.get('/', listSales);

module.exports = router;
