/**
 * Migration script to backfill admin ownership fields for multi-tenant isolation.
 * Usage: node src/scripts/migrateAddAdminScope.js
 * Ensure env variables (DB, JWT, etc.) are loaded (e.g., via dotenv) before running.
 */
const mongoose = require('mongoose');
const path = require('path');
const env = require('../config/env');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const InventoryTransaction = require('../models/InventoryTransaction');

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected');

  const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 });
  if (admins.length === 0) {
    console.error('No admin users found. Aborting.');
    process.exit(1);
  }
  const primaryAdmin = admins[0];
  if (admins.length > 1) {
    console.warn(`Multiple admins detected (${admins.length}). This script will default ownership to the earliest admin (${primaryAdmin._id}). Review afterwards.`);
  }

  // Employees without admin assigned
  const employeesNoAdmin = await User.find({ role: 'employee', admin: { $exists: false } });
  for (const emp of employeesNoAdmin) {
    emp.admin = primaryAdmin._id;
    await emp.save();
  }
  console.log(`Employees updated: ${employeesNoAdmin.length}`);

  // Medicines without admin
  const medsNoAdmin = await Medicine.find({ admin: { $exists: false } });
  for (const med of medsNoAdmin) {
    med.admin = primaryAdmin._id;
    await med.save();
  }
  console.log(`Medicines updated: ${medsNoAdmin.length}`);

  // Sales without admin (try infer from user if employee)
  const salesNoAdmin = await Sale.find({ admin: { $exists: false } }).populate('user');
  for (const sale of salesNoAdmin) {
    let adminId = primaryAdmin._id;
    if (sale.user && sale.user.role === 'employee' && sale.user.admin) {
      adminId = sale.user.admin;
    } else if (sale.user && sale.user.role === 'admin') {
      adminId = sale.user._id;
    }
    sale.admin = adminId;
    await sale.save();
  }
  console.log(`Sales updated: ${salesNoAdmin.length}`);

  // InventoryTransactions without admin (infer from user)
  const txNoAdmin = await InventoryTransaction.find({ admin: { $exists: false } }).populate('user');
  for (const tx of txNoAdmin) {
    let adminId = primaryAdmin._id;
    if (tx.user && tx.user.role === 'employee' && tx.user.admin) {
      adminId = tx.user.admin;
    } else if (tx.user && tx.user.role === 'admin') {
      adminId = tx.user._id;
    }
    tx.admin = adminId;
    await tx.save();
  }
  console.log(`Inventory transactions updated: ${txNoAdmin.length}`);

  console.log('Migration complete');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
