const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { listMedicines, addMedicine, updateMedicine, addBatch, restock, lowStock, uploadExcel } = require('../controllers/inventoryController');
const { validateAddMedicine } = require('../validators/inventoryValidators');

router.use(auth);

router.get('/medicines', listMedicines);
router.post('/medicines', requireRole(['admin','employee']), validateAddMedicine, addMedicine); // admin or employee can add
router.put('/medicines/:medicineId', requireRole(['admin','employee']), updateMedicine); // admin or employee can update
router.post('/medicines/:medicineId/batches', requireRole(['admin','employee']), addBatch);
router.post('/medicines/:medicineId/restock', requireRole(['admin','employee']), restock);
router.get('/low-stock', lowStock);
router.post('/upload', requireRole(['admin','employee']), upload.single('file'), uploadExcel);

module.exports = router;
