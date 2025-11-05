const mongoose = require('mongoose');

const InventoryTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['purchase', 'restock', 'adjustment'], required: true },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNo: { type: String, required: true },
  quantityChange: { type: Number, required: true },
  purchasePrice: { type: Number },
  salePrice: { type: Number },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  // Owning admin for the transaction (derived from user)
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema);
