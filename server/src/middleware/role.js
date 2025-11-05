module.exports = function requireRole(roles) {
  return function(req, res, next) {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: requires one of [' + allowed.join(', ') + ']' });
    }
    next();
  };
};
