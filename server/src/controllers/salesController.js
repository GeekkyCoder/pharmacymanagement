const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const { generateReceiptNumber } = require('../utils/receipt');
const { log } = require('../utils/audit');

function computeTotals(items) {
  let subtotal = 0; let totalDiscount = 0; const computed = [];
  for (const item of items) {
    const lineBase = item.unitPrice * item.quantity;
    let discount = 0;
    if (item.discountType === 'flat') discount = item.discountValue;
    if (item.discountType === 'percent') discount = lineBase * (item.discountValue / 100);
    const lineTotal = lineBase - discount;
    subtotal += lineBase; totalDiscount += discount;
    computed.push({ ...item, lineTotal, discountValue: item.discountValue || 0 });
  }
  return { items: computed, subtotal, totalDiscount, total: subtotal - totalDiscount };
}

function currentAdminId(user) {
  return user.role === 'admin' ? user._id : user.admin;
}

exports.createSale = async (req, res, next) => {
  try {
    const { items, paymentMethod } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items required' });
    // Validate and deduct stock
    for (const it of items) {
      const med = await Medicine.findById(it.medicine);
      if (!med) return res.status(400).json({ message: 'Medicine missing' });
      med.decrementStock(it.batchNo, it.quantity);
      await med.save();
    }
    const totals = computeTotals(items);
    const adminId = currentAdminId(req.user);
    const sale = await Sale.create({
      receiptNumber: generateReceiptNumber(),
      items: totals.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      total: totals.total,
      paymentMethod: paymentMethod || 'cash',
      user: req.user._id,
      admin: adminId
    });
    log(req.user, 'createSale', 'Sale', sale._id.toString(), null, sale);
    res.status(201).json(sale);
  } catch (err) { next(err); }
};

exports.cancelSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = currentAdminId(req.user);
    const sale = await Sale.findOne({ _id: id, admin: adminId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    if (sale.status !== 'active') return res.status(400).json({ message: 'Cannot cancel' });
  const before = sale.toObject();
  sale.status = 'cancelled';
    sale.cancelReason = reason || 'cancelled';
    sale.cancelledAt = new Date();
    await sale.save();
    // Restock items
    for (const it of sale.items) {
      const med = await Medicine.findById(it.medicine);
      if (med) {
        const batch = med.batches.find(b => b.batchNo === it.batchNo);
        if (batch) batch.quantity += it.quantity;
        await med.save();
      }
    }
    log(req.user, 'cancelSale', 'Sale', sale._id.toString(), before, sale);
    res.json(sale);
  } catch (err) { next(err); }
};

exports.retrySale = async (req, res, next) => {
  try {
    const { originalId } = req.params;
    const adminId = currentAdminId(req.user);
    const original = await Sale.findOne({ _id: originalId, admin: adminId });
    if (!original) return res.status(404).json({ message: 'Original sale not found' });
    const { items, paymentMethod } = req.body;
    const totals = computeTotals(items);
    const newSale = await Sale.create({
      receiptNumber: generateReceiptNumber(),
      items: totals.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      total: totals.total,
      paymentMethod: paymentMethod || 'cash',
      user: req.user._id,
      admin: adminId,
      originalSaleRef: original._id
    });
    const beforeOriginal = original.toObject();
    original.status = 'replaced';
    await original.save();
    log(req.user, 'retrySale', 'Sale', newSale._id.toString(), null, newSale);
    log(req.user, 'replaceSale', 'Sale', original._id.toString(), beforeOriginal, original);
    res.status(201).json(newSale);
  } catch (err) { next(err); }
};

exports.getSale = async (req, res, next) => {
  try {
    const adminId = currentAdminId(req.user);
    const sale = await Sale.findOne({ _id: req.params.id, admin: adminId }).populate('user', 'name email');
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { next(err); }
};

exports.listSales = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const adminId = currentAdminId(req.user);
    filter.admin = adminId;
    const sales = await Sale.find(filter).sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) { next(err); }
};
