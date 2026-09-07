const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    jwt.verify(token, process.env.JWT_SECRET || 'worktrack_pro_super_secret_jwt_key_2026', (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'Unauthorized: Access token missing' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(401).json({ message: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  requireRole,
};
