'use strict';

const jwt    = require('jsonwebtoken');
const { getDb } = require('../config/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Erişim reddedildi. Oturum açmanız gerekiyor.',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const db   = getDb();
    const user = db.prepare(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?'
    ).get(payload.sub);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Hesap bulunamadı veya askıya alındı.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Oturum süresi doldu. Lütfen tekrar giriş yapın.'
        : 'Geçersiz oturum jetonu.';

    return res.status(401).json({ success: false, message });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db      = getDb();
    const user    = db.prepare(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?'
    ).get(payload.sub);

    if (user && user.is_active) req.user = user;
  } catch (_) {}

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kimlik doğrulama gerekli.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok.',
      });
    }

    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };