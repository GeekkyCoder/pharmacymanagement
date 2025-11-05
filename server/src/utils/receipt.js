const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

module.exports.generateReceiptNumber = () => {
  const datePart = moment().format('YYYYMMDD');
  const unique = uuidv4().split('-')[0].toUpperCase();
  return `${env.receiptPrefix}-${datePart}-${unique}`;
};
