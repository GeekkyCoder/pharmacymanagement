const Medicine = require('../models/Medicine');
const InventoryTransaction = require('../models/InventoryTransaction');
const XLSX = require('xlsx');
const { log } = require('../utils/audit');

// Resolve current admin context (admin users use their own id; employees use their assigned admin)
function currentAdminId(user) {
  return user.role === 'admin' ? user._id : user.admin;
}

exports.listMedicines = async (req, res, next) => {
  try {
    const adminId = currentAdminId(req.user);
    const meds = await Medicine.find({ admin: adminId });
    res.json(meds.map(m => ({
      id: m._id,
      name: m.name,
      genericName: m.genericName,
      strength: m.strength,
      totalQuantity: m.totalQuantity,
      low: m.totalQuantity <= m.lowStockThreshold,
      batches: m.batches
    })));
  } catch (err) { next(err); }
};

exports.addMedicine = async (req, res, next) => {
  try {
    const { name, genericName, manufacturer, form, strength, category, controlled, lowStockThreshold, batch } = req.body;
    const adminId = currentAdminId(req.user);
    const med = await Medicine.create({
      name, genericName, manufacturer, form, strength, category, controlled, lowStockThreshold,
      batches: batch ? [batch] : [],
      admin: adminId
    });
    log(req.user, 'create', 'Medicine', med._id.toString(), null, med);
    res.status(201).json(med);
  } catch (err) { next(err); }
};

exports.addBatch = async (req, res, next) => {
  try {
    const { medicineId } = req.params;
    const { batchNo, expiryDate, quantity, purchasePrice, salePrice } = req.body;
    const adminId = currentAdminId(req.user);
    const med = await Medicine.findOne({ _id: medicineId, admin: adminId });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    const before = med.toObject();
    med.batches.push({ batchNo, expiryDate, quantity, purchasePrice, salePrice });
    await med.save();
    await InventoryTransaction.create({ type: 'purchase', medicine: med._id, batchNo, quantityChange: quantity, purchasePrice, salePrice, user: req.user._id, admin: adminId });
    log(req.user, 'addBatch', 'Medicine', med._id.toString(), before, med);
    res.status(201).json(med);
  } catch (err) { next(err); }
};

exports.restock = async (req, res, next) => {
  try {
    const { medicineId } = req.params;
    const { batchNo, quantity } = req.body;
    const adminId = currentAdminId(req.user);
    const med = await Medicine.findOne({ _id: medicineId, admin: adminId });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    const batch = med.batches.find(b => b.batchNo === batchNo);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const before = med.toObject();
    batch.quantity += quantity;
    await med.save();
    await InventoryTransaction.create({ type: 'restock', medicine: med._id, batchNo, quantityChange: quantity, user: req.user._id, admin: adminId });
    log(req.user, 'restock', 'Medicine', med._id.toString(), before, med);
    res.json(med);
  } catch (err) { next(err); }
};

exports.lowStock = async (req, res, next) => {
  try {
    const adminId = currentAdminId(req.user);
    const meds = await Medicine.find({ admin: adminId });
    const low = meds.filter(m => m.totalQuantity <= m.lowStockThreshold);
    res.json(low);
  } catch (err) { next(err); }
};

exports.uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File required' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const created = [];
    const adminId = currentAdminId(req.user);
    for (const r of rows) {
      if (!r.name || !r.batchNo) continue;
      const med = await Medicine.create({
        name: r.name,
        genericName: r.genericName,
        manufacturer: r.manufacturer,
        form: r.form,
        strength: r.strength,
        category: r.category,
        controlled: r.controlled === 'yes',
        lowStockThreshold: Number(r.lowStockThreshold) || 10,
        batches: [{
          batchNo: r.batchNo,
          expiryDate: r.expiryDate ? new Date(r.expiryDate) : new Date(),
          quantity: Number(r.quantity) || 0,
          purchasePrice: Number(r.purchasePrice) || 0,
          salePrice: Number(r.salePrice) || 0,
        }],
        admin: adminId
      });
      created.push(med);
      log(req.user, 'bulkImport', 'Medicine', med._id.toString(), null, med);
    }
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { next(err); }
};
