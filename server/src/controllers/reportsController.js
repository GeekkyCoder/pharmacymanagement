const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const moment = require('moment');

function currentAdminId(user) {
  return user.role === 'admin' ? user._id : user.admin;
}

exports.salesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const adminId = currentAdminId(req.user);
    const filter = { status: { $ne: 'cancelled' }, admin: adminId };
    let range = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) { filter.createdAt.$gte = new Date(from); range.from = from; }
      if (to) { filter.createdAt.$lte = new Date(to); range.to = to; }
    }
    const sales = await Sale.find(filter).sort({ createdAt: -1 });
    let total = 0, discount = 0, subtotal = 0;
    const itemsSold = {};
    for (const s of sales) {
      subtotal += s.subtotal;
      discount += s.totalDiscount;
      total += s.total;
      for (const it of s.items) {
        itemsSold[it.medicine] = (itemsSold[it.medicine] || 0) + it.quantity;
      }
    }
    res.json({
      range,
      count: sales.length,
      subtotal,
      discount,
      total,
      itemsSold,
      sales
    });
  } catch (err) { next(err); }
};

// Dashboard aggregated stats (admin only)
exports.dashboardStats = async (req, res, next) => {
  try {
    // Date ranges
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const last14Start = moment().subtract(13, 'days').startOf('day').toDate();
    const last7Start = moment().subtract(6, 'days').startOf('day').toDate();
    const adminId = currentAdminId(req.user);

    // Daily revenue (last 14 days, active sales only)
    const dailyAgg = await Sale.aggregate([
      { $match: { status: 'active', createdAt: { $gte: last14Start }, admin: adminId } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { '_id.day': 1 } }
    ]);
    // Fill missing days
    const dailyRevenue = [];
    for (let i = 13; i >= 0; i--) {
      const d = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const found = dailyAgg.find(x => x._id.day === d);
      dailyRevenue.push({ day: d, revenue: found ? found.revenue : 0, count: found ? found.count : 0 });
    }

    // Top selling (last 7 days)
    const topSellingAgg = await Sale.aggregate([
      { $match: { status: 'active', createdAt: { $gte: last7Start }, admin: adminId } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicine', quantity: { $sum: '$items.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'med' } },
      { $unwind: '$med' },
      { $project: { medicineId: '$med._id', name: '$med.name', quantity: 1, _id: 0 } }
    ]);

    // Today's discount & revenue stats
    const todayAgg = await Sale.aggregate([
      { $match: { status: 'active', createdAt: { $gte: todayStart, $lte: todayEnd }, admin: adminId } },
      { $group: { _id: null, subtotal: { $sum: '$subtotal' }, totalDiscount: { $sum: '$totalDiscount' }, totalRevenue: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);
    const todayStatsRaw = todayAgg[0] || { subtotal: 0, totalDiscount: 0, totalRevenue: 0, count: 0 };
    const avgDiscountPercent = todayStatsRaw.subtotal > 0 ? (todayStatsRaw.totalDiscount / todayStatsRaw.subtotal) * 100 : 0;

    // Inventory stats & low stock
  const meds = await Medicine.find({ admin: adminId });
    let inventoryValue = 0; let totalStockUnits = 0;
    const lowStock = [];
    for (const m of meds) {
      let medQty = 0; let medValue = 0;
      for (const b of m.batches) {
        medQty += b.quantity;
        medValue += b.quantity * b.salePrice;
      }
      totalStockUnits += medQty;
      inventoryValue += medValue;
      if (medQty <= m.lockStockThreshold) {
        lowStock.push({ id: m._id, productName: m.productName, quantity: medQty, threshold: m.lockStockThreshold });
      }
    }
    lowStock.sort((a,b) => a.quantity - b.quantity);
    const lowStockPreview = lowStock.slice(0, 5);

    res.json({
      dailyRevenue,
      topSelling: topSellingAgg,
      today: {
        revenue: todayStatsRaw.totalRevenue,
        subtotal: todayStatsRaw.subtotal,
        discount: todayStatsRaw.totalDiscount,
        salesCount: todayStatsRaw.count,
        avgDiscountPercent: Number(avgDiscountPercent.toFixed(2))
      },
      inventory: {
        medicineCount: meds.length,
        totalStockUnits,
        inventoryValue,
        lowStockCount: lowStock.length,
        lowStockPreview
      }
    });
  } catch (err) { next(err); }
};
