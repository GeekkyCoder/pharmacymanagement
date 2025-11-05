require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../../src/models/User');

(async () => {
  try {
    await connectDB();
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      console.log('Admin already exists:', admin.email);
    } else {
      const created = await User.create({
        name: 'Default Admin',
        email: process.env.SEED_ADMIN_EMAIL || 'admin@local.test',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
        role: 'admin'
      });
      console.log('Admin created:', created.email);
      console.log('IMPORTANT: Change the default password immediately.');
    }
  } catch (err) {
    console.error('Seed error', err);
  } finally {
    process.exit(0);
  }
})();
