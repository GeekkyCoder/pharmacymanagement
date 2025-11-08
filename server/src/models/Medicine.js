const mongoose = require('mongoose');

// Retain batch structure for downstream stock operations.
const BatchSchema = new mongoose.Schema({
  batchNo: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
}, { _id: false });

// New streamlined medicine schema per updated requirements.
// Fields kept from previous version: batches, controlled, admin (multi-tenant), lockStockThreshold (renamed).
// Removed legacy descriptive fields (name/generic/manufacturer/form/strength/category) in favor of standardized product metadata.
const MedicineSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true }, // e.g. Tablet, Syrup, Injection
  group: { type: String, required: true, trim: true }, // e.g. Paracetamol, Ciprofloxacin
  brand: { type: String, required: true, trim: true }, // e.g. Sami, GSK
  productName: { type: String, required: true, trim: true }, // medicine name + strength
  printName: { type: String, required: true, trim: true }, // usually same as productName
  purchasePrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  purchaseDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  controlled: { type: Boolean, default: false },
  lockStockThreshold: { type: Number, default: 10, min: 0 },
  batches: { type: [BatchSchema], default: [] },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
}, { timestamps: true });

// Derived quantity from batches for reporting / low stock checks.
MedicineSchema.virtual('totalQuantity').get(function() {
  return this.batches.reduce((sum, b) => sum + b.quantity, 0);
});

// Ensure printName defaults to productName if omitted.
MedicineSchema.pre('validate', function(next) {
  if (!this.printName) this.printName = this.productName;
  next();
});

// Business rules validations.
MedicineSchema.pre('validate', function(next) {
  if (this.salePrice < this.purchasePrice) {
    return next(new Error('Sale price must be greater than or equal to purchase price'));
  }
  if (this.expiryDate <= this.purchaseDate) {
    return next(new Error('Expiry date must be after purchase date'));
  }
  next();
});

MedicineSchema.methods.decrementStock = function(batchNo, qty) {
  const batch = this.batches.find(b => b.batchNo === batchNo);
  if (!batch || batch.quantity < qty) throw new Error('Insufficient stock for batch');
  batch.quantity -= qty;
};

// Helpful indexes for querying & reporting.
MedicineSchema.index({ productName: 1, brand: 1, admin: 1 }, { unique: false });

module.exports = mongoose.model('Medicine', MedicineSchema);
