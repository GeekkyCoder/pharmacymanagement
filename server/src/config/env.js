require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiry: process.env.JWT_EXPIRY || '8h',
  receiptPrefix: process.env.RECEIPT_PREFIX || 'RCPT',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacy'
};
