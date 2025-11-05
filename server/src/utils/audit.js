const AuditLog = require('../models/AuditLog');

async function log(user, action, entity, entityId, before, after) {
  try {
    await AuditLog.create({
      user: user?._id,
      action,
      entity,
      entityId,
      before,
      after
    });
  } catch (e) {
    console.error('Audit log error', e.message);
  }
}

module.exports = { log };
