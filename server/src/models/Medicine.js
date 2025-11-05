const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  batchNo: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
}, { _id: false });

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true },
  manufacturer: { type: String, trim: true },
  form: { type: String, trim: true }, // tablet, syrup, etc.
  strength: { type: String, trim: true },
  category: { type: String, trim: true },
  controlled: { type: Boolean, default: false },
  lowStockThreshold: { type: Number, default: 10 },
  batches: { type: [BatchSchema], default: [] },
  // Owning admin (multi-tenant isolation)
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
}, { timestamps: true });

MedicineSchema.virtual('totalQuantity').get(function() {
  return this.batches.reduce((sum, b) => sum + b.quantity, 0);
});

MedicineSchema.methods.decrementStock = function(batchNo, qty) {
  const batch = this.batches.find(b => b.batchNo === batchNo);
  if (!batch || batch.quantity < qty) throw new Error('Insufficient stock for batch');
  batch.quantity -= qty;
};

module.exports = mongoose.model('Medicine', MedicineSchema);
