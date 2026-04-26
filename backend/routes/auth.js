'use strict';

const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User         = require('../models/User');
const { requireAuth } = require('../middleware/auth');

function signToken(userId) {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Kullanıcı adı 3–30 karakter olmalıdır.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi girin.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Şifre en az 8 karakter olmalıdır.')
    .matches(/[A-Z]/)
    .withMessage('Şifre en az bir büyük harf içermelidir.')
    .matches(/[0-9]/)
    .withMessage('Şifre en az bir rakam içermelidir.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Geçerli bir e-posta adresi girin.').normalizeEmail(),
  body('password').notEmpty().withMessage('Şifre boş olamaz.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Doğrulama hatası.',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (User.findByEmail(email)) {
      return res.status(409).json({
        success: false,
        message: 'Bu e-posta adresi zaten kullanımda.',
      });
    }

    if (User.findByUsername(username)) {
      return res.status(409).json({
        success: false,
        message: 'Bu kullanıcı adı zaten alınmış.',
      });
    }

    const user  = await User.create({ username, email, password, display_name });
    const token = signToken(user.id);

    return res.status(201).json({
      success: true,
      message: 'Kayıt başarılı. Hoş geldiniz!',
      data: { token, user: User.sanitize(user) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'E-posta veya şifre hatalı.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Hesabınız askıya alınmıştır.',
      });
    }

    const valid = await User.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'E-posta veya şifre hatalı.',
      });
    }

    const token = signToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Giriş başarılı.',
      data: { token, user: User.sanitize(user) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res) => {
  return res.json({
    success: true,
    message: 'Oturum başarıyla kapatıldı.',
  });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    data: { user: req.user },
  });
});

module.exports = router;