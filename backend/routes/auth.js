'use strict';

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET tanimli degil.');
    err.status = 500;
    throw err;
  }
  return process.env.JWT_SECRET;
}

function signToken(userId) {
  return jwt.sign(
    { sub: userId },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Kullanici adi 3-30 karakter olmalidir.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Kullanici adi yalnizca harf, rakam ve alt cizgi icerebilir.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Gecerli bir e-posta adresi girin.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Sifre 8-128 karakter arasinda olmalidir.')
    .matches(/[A-Z]/)
    .withMessage('Sifre en az bir buyuk harf icermelidir.')
    .matches(/[0-9]/)
    .withMessage('Sifre en az bir rakam icermelidir.'),
  body('display_name')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Gorunen ad en fazla 80 karakter olabilir.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Gecerli bir e-posta adresi girin.').normalizeEmail(),
  body('password').notEmpty().withMessage('Sifre bos olamaz.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Dogrulama hatasi.',
      errors: errors.array().map(error => ({ field: error.path, message: error.msg })),
    });
  }
  next();
}

router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (await User.findByEmail(email)) {
      return res.status(409).json({ success: false, message: 'Bu e-posta adresi zaten kullanimda.' });
    }

    if (await User.findByUsername(username)) {
      return res.status(409).json({ success: false, message: 'Bu kullanici adi zaten alinmis.' });
    }

    const user = await User.create({ username, email, password, display_name });
    const token = signToken(user.id);

    return res.status(201).json({
      success: true,
      message: 'Kayit basarili.',
      data: { token, user: User.sanitize(user) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'E-posta veya sifre hatali.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Hesabiniz askiya alinmistir.' });
    }

    const valid = await User.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'E-posta veya sifre hatali.' });
    }

    const token = signToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Giris basarili.',
      data: { token, user: User.sanitize(user) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (_req, res) => {
  return res.json({ success: true, message: 'Oturum kapatildi.' });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ success: true, data: { user: req.user } });
});

module.exports = router;

