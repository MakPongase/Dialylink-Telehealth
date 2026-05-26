const jwt = require('jsonwebtoken');
const path = require('path');
const pool = require('../db/pool');

// Load environment variables for JWT_SECRET
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Warning: JWT_SECRET is not defined in environment variables.');
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token format.'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // DB check to immediately block suspended users
    const checkRes = await pool.query('SELECT is_suspended FROM users WHERE id = $1', [decoded.id]);
    if (checkRes.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Access denied. User not found.' });
    }
    if (checkRes.rows[0].is_suspended) {
      return res.status(403).json({ success: false, message: 'Access denied. Account is suspended by administrator.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid or expired token.'
    });
  }
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User role not resolved.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};
