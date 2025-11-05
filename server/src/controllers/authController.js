const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { log } = require('../utils/audit');
const bcrypt = require('bcrypt');

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiry });
}

exports.registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already used' });
    const user = await User.create({ name, email, password, role: 'admin' });
    log(user, 'registerAdmin', 'User', user._id.toString(), null, { id: user._id, email: user.email });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: sign(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: sign(user) });
  } catch (err) { next(err); }
};

exports.createEmployee = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already used' });
    // Assign owning admin
    const employee = await User.create({ name, email, password, role: 'employee', admin: req.user._id });
    log(req.user, 'createEmployee', 'User', employee._id.toString(), null, { id: employee._id, email: employee.email });
    res.status(201).json({ id: employee._id, name: employee.name, email: employee.email, role: employee.role });
  } catch (err) { next(err); }
};

exports.listEmployees = async (req, res, next) => {
  try {
    // Only employees belonging to this admin
    console.log('user', req.user);
    const employees = await User.find({ role: 'employee', admin: req.user._id }).select('-password');
    res.json(employees);
  } catch (err) { next(err); }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = await User.findById(id);
  if (!user || user.role !== 'employee' || String(user.admin) !== String(req.user._id)) return res.status(404).json({ message: 'Employee not found' });
    const before = user.toObject();
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    log(req.user, 'updateEmployee', 'User', user._id.toString(), before, { name: user.name, email: user.email });
    res.json({ id: user._id, name: user.name, email: user.email, active: user.active });
  } catch (err) { next(err); }
};

exports.toggleEmployeeActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
  if (!user || user.role !== 'employee' || String(user.admin) !== String(req.user._id)) return res.status(404).json({ message: 'Employee not found' });
    const before = user.toObject();
    user.active = !user.active;
    await user.save();
    log(req.user, 'toggleEmployeeActive', 'User', user._id.toString(), before, { active: user.active });
    res.json({ id: user._id, active: user.active });
  } catch (err) { next(err); }
};

exports.resetEmployeePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required' });
    const user = await User.findById(id);
  if (!user || user.role !== 'employee' || String(user.admin) !== String(req.user._id)) return res.status(404).json({ message: 'Employee not found' });
    const before = user.toObject();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    log(req.user, 'resetEmployeePassword', 'User', user._id.toString(), before && { id: before._id }, { id: user._id });
    res.json({ id: user._id, message: 'Password reset' });
  } catch (err) { next(err); }
};
