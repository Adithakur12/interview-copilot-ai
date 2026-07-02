const jwt = require('jsonwebtoken');
const { getDbClient } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'interview-copilot-jwt-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '30d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
    } catch (error) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

function requirePlan(...plans) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!plans.includes(req.user.plan)) {
      return res.status(403).json({ error: `This feature requires one of these plans: ${plans.join(', ')}.` });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.email !== 'admin@interviewcopilot.com') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { generateToken, verifyToken, authenticate, optionalAuth, requirePlan, requireAdmin, JWT_SECRET };
