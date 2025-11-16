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
    const { search } = req.query;
    
    let query = { admin: adminId };
    
    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { productName: searchRegex },
        { brand: searchRegex },
        { group: searchRegex },
        { type: searchRegex },
        { printName: searchRegex }
      ];
    }
    
    const meds = await Medicine.find(query);
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
    
    // Check if medicine with same productName and brand exists
    const existingMedicine = await Medicine.findOne({
      productName: productName.trim(),
      brand: brand.trim(),
      admin: adminId
    });

    if (existingMedicine) {
      // Check if batch already exists
      const existingBatch = existingMedicine.batches.find(b => b.batchNo === batchNo.trim());
      
      if (existingBatch) {
        return res.status(400).json({ 
          message: 'Medicine with this brand and batch number already exists',
          existingMedicine: existingMedicine._id
        });
      } else {
        // Add new batch to existing medicine
        const before = existingMedicine.toObject();
        existingMedicine.batches.push({
          batchNo: batchNo.trim(),
          expiryDate,
          quantity,
          purchasePrice,
          salePrice
        });
        await existingMedicine.save();
        await InventoryTransaction.create({ 
          type: 'purchase', 
          medicine: existingMedicine._id, 
          batchNo: batchNo.trim(), 
          quantityChange: quantity, 
          purchasePrice, 
          salePrice, 
          user: req.user._id, 
          admin: adminId 
        });
        log(req.user, 'addBatch', 'Medicine', existingMedicine._id.toString(), before, existingMedicine);
        return res.status(201).json({ 
          message: 'New batch added to existing medicine',
          medicine: existingMedicine 
        });
      }
    }

    // Create new medicine if it doesn't exist
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
    log(req.user, 'create', 'Medicine', med._id.toString(), null, med);
    res.status(201).json(med);
  } catch (err) { next(err); }
};

exports.updateMedicine = async (req, res, next) => {
  try {
    const { medicineId } = req.params;
    const { type, group, brand, productName, printName, purchasePrice, salePrice, purchaseDate, expiryDate, controlled, lockStockThreshold } = req.body;
    const adminId = currentAdminId(req.user);
    
    const med = await Medicine.findOne({ _id: medicineId, admin: adminId });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    
    const before = med.toObject();
    
    // Update medicine fields
    if (type) med.type = type;
    if (group) med.group = group;
    if (brand) med.brand = brand;
    if (productName) med.productName = productName;
    if (printName) med.printName = printName;
    if (purchasePrice !== undefined) med.purchasePrice = purchasePrice;
    if (salePrice !== undefined) med.salePrice = salePrice;
    if (purchaseDate) med.purchaseDate = purchaseDate;
    if (expiryDate) med.expiryDate = expiryDate;
    if (controlled !== undefined) med.controlled = controlled;
    if (lockStockThreshold !== undefined) med.lockStockThreshold = lockStockThreshold;
    
    await med.save();
    log(req.user, 'update', 'Medicine', med._id.toString(), before, med);
    res.json(med);
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
    const skipped = [];
    const batchesAdded = [];

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
        const productNameTrimmed = norm.productName.trim();
        const brandTrimmed = norm.brand.trim();
        const batchNoTrimmed = String(norm.batchNo).trim();

        // Check if medicine with same productName and brand exists
        const existingMedicine = await Medicine.findOne({
          productName: productNameTrimmed,
          brand: brandTrimmed,
          admin: adminId
        });

        if (existingMedicine) {
          // Check if batch already exists
          const existingBatch = existingMedicine.batches.find(b => b.batchNo === batchNoTrimmed);
          
          if (existingBatch) {
            // Skip: duplicate medicine with duplicate batch
            skipped.push({
              productName: productNameTrimmed,
              brand: brandTrimmed,
              batchNo: batchNoTrimmed,
              reason: 'Duplicate medicine and batch'
            });
            continue;
          } else {
            // Add new batch to existing medicine
            const before = existingMedicine.toObject();
            existingMedicine.batches.push({
              batchNo: batchNoTrimmed,
              expiryDate: new Date(norm.expiryDate),
              quantity: Number(norm.quantity) || 0,
              purchasePrice: purchasePriceNum,
              salePrice: salePriceNum
            });
            await existingMedicine.save();
            await InventoryTransaction.create({ 
              type: 'purchase', 
              medicine: existingMedicine._id, 
              batchNo: batchNoTrimmed, 
              quantityChange: Number(norm.quantity) || 0, 
              purchasePrice: purchasePriceNum, 
              salePrice: salePriceNum, 
              user: req.user._id, 
              admin: adminId 
            });
            batchesAdded.push({
              productName: productNameTrimmed,
              brand: brandTrimmed,
              batchNo: batchNoTrimmed
            });
            log(req.user, 'bulkImportAddBatch', 'Medicine', existingMedicine._id.toString(), before, existingMedicine);
          }
        } else {
          // Create new medicine
          const med = await Medicine.create({
            type: norm.type.trim(),
            group: norm.group.trim(),
            brand: brandTrimmed,
            productName: productNameTrimmed,
            printName: (norm.printName || norm.productName).trim(),
            purchasePrice: purchasePriceNum,
            salePrice: salePriceNum,
            purchaseDate: new Date(norm.purchaseDate),
            expiryDate: new Date(norm.expiryDate),
            controlled: !!norm.controlled && String(norm.controlled).toLowerCase() === 'yes',
            lockStockThreshold: Number(norm.lockStockThreshold) || 10,
            batches: [
              {
                batchNo: batchNoTrimmed,
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
        }
      } catch (e) {
        // Skip invalid record silently; could accumulate errors array for feedback
        continue;
      }
    }
    res.status(201).json({ 
      newMedicines: created.length,
      newBatches: batchesAdded.length,
      skippedDuplicates: skipped.length,
      items: created,
      batchesAdded,
      skipped
    });
  } catch (err) { next(err); }
};
