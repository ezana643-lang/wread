'use strict';

const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET tanimli degil.');
    err.status = 500;
    throw err;
  }
  return process.env.JWT_SECRET;
}

function tokenFromHeader(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function loadUser(userId) {
  const pool = getDb();
  const result = await pool.query(
    'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function requireAuth(req, res, next) {
  const token = tokenFromHeader(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Oturum acmaniz gerekiyor.',
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await loadUser(payload.sub);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Hesap bulunamadi veya askiya alindi.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.status) return next(err);

    const message =
      err.name === 'TokenExpiredError'
        ? 'Oturum suresi doldu. Lutfen tekrar giris yapin.'
        : 'Gecersiz oturum jetonu.';

    return res.status(401).json({ success: false, message });
  }
}

async function optionalAuth(req, _res, next) {
  const token = tokenFromHeader(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await loadUser(payload.sub);
    if (user && user.is_active) req.user = user;
  } catch (_) {
    // Anonymous access should continue when an optional token is invalid.
  }

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Kimlik dogrulama gerekli.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bu islem icin yetkiniz yok.' });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };

