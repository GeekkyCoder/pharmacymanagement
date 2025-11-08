const { body, validationResult } = require('express-validator');

// Validation chain for creating a medicine WITH initial batch (batchNo + quantity).
exports.validateAddMedicine = [
  body('type').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Type 2-60 chars'),
  body('group').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Group 2-120 chars'),
  body('brand').isString().trim().isLength({ min: 1, max: 120 }).withMessage('Brand 1-120 chars'),
  body('productName').isString().trim().isLength({ min: 2, max: 160 }).withMessage('Product name 2-160 chars'),
  body('printName').optional().isString().trim().isLength({ min: 2, max: 160 }).withMessage('Print name 2-160 chars'),
  body('purchasePrice').isFloat({ gt: 0 }).withMessage('Purchase price > 0'),
  body('salePrice').isFloat({ gt: 0 }).withMessage('Sale price > 0').custom((value, { req }) => {
    if (req.body.purchasePrice && value < req.body.purchasePrice) {
      throw new Error('Sale price must be >= purchase price');
    }
    return true;
  }),
  body('purchaseDate').isISO8601().toDate().withMessage('Valid purchase date required'),
  body('expiryDate').isISO8601().toDate().withMessage('Valid expiry date required').custom((val, { req }) => {
    if (req.body.purchaseDate && new Date(val) <= new Date(req.body.purchaseDate)) {
      throw new Error('Expiry must be after purchase date');
    }
    return true;
  }),
  body('batchNo').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Batch number 2-50 chars'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('controlled').optional().isBoolean().withMessage('Controlled must be boolean'),
  body('lockStockThreshold').optional().isInt({ min: 0 }).withMessage('Lock stock threshold must be >=0'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];

// Separate validator for adding batches later (kept for extensibility)
exports.validateAddBatch = [
  body('batchNo').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Batch number 2-50 chars'),
  body('expiryDate').isISO8601().toDate().withMessage('Valid expiry date required').custom(val => {
    if (val <= new Date()) throw new Error('Expiry date must be future');
    return true;
  }),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be >=1'),
  body('purchasePrice').isFloat({ gt: 0 }).withMessage('Purchase price >0'),
  body('salePrice').isFloat({ gt: 0 }).withMessage('Sale price >0').custom((value, { req }) => {
    if (req.body.purchasePrice && value < req.body.purchasePrice) {
      throw new Error('Sale price must be >= purchase price');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];
