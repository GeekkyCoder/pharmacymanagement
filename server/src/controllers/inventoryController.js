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
      productName: m.productName,
      printName: m.printName,
      brand: m.brand,
      group: m.group,
      type: m.type,
      purchasePrice: m.purchasePrice,
      salePrice: m.salePrice,
      purchaseDate: m.purchaseDate,
      expiryDate: m.expiryDate,
      totalQuantity: m.totalQuantity,
      low: m.totalQuantity <= m.lockStockThreshold,
      lockStockThreshold: m.lockStockThreshold,
      controlled: m.controlled,
      batches: m.batches
    })));
  } catch (err) { next(err); }
};

exports.addMedicine = async (req, res, next) => {
  try {
    const { type, group, brand, productName, printName, purchasePrice, salePrice, purchaseDate, expiryDate, controlled, lockStockThreshold, batchNo, quantity } = req.body;
    const adminId = currentAdminId(req.user);
    const med = await Medicine.create({
      type,
      group,
      brand,
      productName,
      printName,
      purchasePrice,
      salePrice,
      purchaseDate,
      expiryDate,
      controlled,
      lockStockThreshold,
      batches: [
        {
          batchNo,
          expiryDate,
          quantity,
          purchasePrice,
          salePrice
        }
      ],
      admin: adminId
    });
    debugger
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
    const low = meds.filter(m => m.totalQuantity <= m.lockStockThreshold);
    res.json(low);
  } catch (err) { next(err); }
};

exports.uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File required' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const adminId = currentAdminId(req.user);
    const created = [];
debugger;
    // Normalize header variants -> internal keys
    const headerMap = {
      'type': 'type',
      'group': 'group',
      'brand': 'brand',
      'product name': 'productName',
      'print name': 'printName',
      'purchase price': 'purchasePrice',
      'sale price': 'salePrice',
      'purchase date': 'purchaseDate',
      'expiry date': 'expiryDate',
      'batch no': 'batchNo',
      'quantity': 'quantity'
    };

    for (const r of rawRows) {
      // Build object with normalized keys (case-insensitive)
      const norm = {};
      for (const k of Object.keys(r)) {
        const mapped = headerMap[k.toLowerCase().trim()];
        if (mapped) norm[mapped] = r[k];
      }
      // Required minimal fields
      if (!norm.type || !norm.group || !norm.brand || !norm.productName || !norm.purchasePrice || !norm.salePrice || !norm.purchaseDate || !norm.expiryDate || !norm.batchNo || !norm.quantity) {
        continue; // skip incomplete rows
      }
      const purchasePriceNum = Number(norm.purchasePrice);
      const salePriceNum = Number(norm.salePrice);
      if (isNaN(purchasePriceNum) || isNaN(salePriceNum)) continue;
      try {
        const med = await Medicine.create({
          type: norm.type.trim(),
          group: norm.group.trim(),
          brand: norm.brand.trim(),
          productName: norm.productName.trim(),
          printName: (norm.printName || norm.productName).trim(),
          purchasePrice: purchasePriceNum,
          salePrice: salePriceNum,
          purchaseDate: new Date(norm.purchaseDate),
          expiryDate: new Date(norm.expiryDate),
          controlled: !!norm.controlled && String(norm.controlled).toLowerCase() === 'yes',
          lockStockThreshold: Number(norm.lockStockThreshold) || 10,
          batches: [
            {
              batchNo: String(norm.batchNo).trim(),
              expiryDate: new Date(norm.expiryDate),
              quantity: Number(norm.quantity) || 0,
              purchasePrice: purchasePriceNum,
              salePrice: salePriceNum
            }
          ],
          admin: adminId
        });
        created.push(med);
        log(req.user, 'bulkImport', 'Medicine', med._id.toString(), null, med);
      } catch (e) {
        // Skip invalid record silently; could accumulate errors array for feedback
        continue;
      }
    }
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { next(err); }
};
