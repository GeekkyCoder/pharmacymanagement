const { body, validationResult } = require('express-validator');

// Validation chain for creating a medicine with initial batch
exports.validateAddMedicine = [
  body('name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Name 2-120 chars'),
  body('genericName').optional().isString().trim().isLength({ min: 2, max: 120 }).withMessage('Generic 2-120 chars'),
  body('form').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('Form 2-50 chars'),
  body('strength').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Strength 1-50 chars'),
  body('category').optional().isString().trim().isLength({ min: 1, max: 60 }).withMessage('Category 1-60 chars'),
  body('controlled').optional().isBoolean().withMessage('Controlled must be boolean'),
  body('lowStockThreshold').optional().isInt({ min: 1 }).withMessage('Low stock threshold must be >=1'),
  body('batch.batchNo').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Batch number 2-50 chars'),
  body('batch.expiryDate').isISO8601().toDate().withMessage('Valid expiry date required').custom(val => {
    if (val <= new Date()) throw new Error('Expiry date must be future');
    return true;
  }),
  body('batch.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('batch.purchasePrice').isFloat({ gt: 0 }).withMessage('Purchase price must be > 0'),
  body('batch.salePrice').isFloat({ gt: 0 }).withMessage('Sale price must be > 0').custom((value, { req }) => {
    if (req.body.batch && value < req.body.batch.purchasePrice) {
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
