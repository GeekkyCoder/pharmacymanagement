const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNo: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discountType: { type: String, enum: ['none','flat','percent'], default: 'none' },
  discountValue: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const SaleSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  items: { type: [SaleItemSchema], required: true },
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash','card','other'], default: 'cash' },
  status: { type: String, enum: ['active','cancelled','replaced'], default: 'active' },
  originalSaleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cancelReason: { type: String },
  cancelledAt: { type: Date },
  // Owning admin (isolation). For sales made by employees, this is their admin; if admin created directly, it's the admin.
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
