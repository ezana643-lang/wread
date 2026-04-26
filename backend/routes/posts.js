'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');

const Post  = require('../models/Post');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const postRules = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Başlık 3–200 karakter olmalıdır.'),
  body('content')
    .trim()
    .isLength({ min: 10 })
    .withMessage('İçerik en az 10 karakter olmalıdır.'),
  body('media_url')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Geçerli bir URL girin.'),
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

router.get('/', optionalAuth, (req, res, next) => {
  try {
    const limit    = parseInt(req.query.limit, 10)  || 20;
    const offset   = parseInt(req.query.offset, 10) || 0;
    const authorId = req.query.author_id ? parseInt(req.query.author_id, 10) : undefined;

    const posts = Post.list({ limit, offset, authorId });
    const total = Post.count({ authorId });

    return res.json({
      success: true,
      data: {
        posts,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, postRules, validate, (req, res, next) => {
  try {
    const { title, content, media_url } = req.body;

    const post = Post.create({
      title,
      content,
      media_url: media_url || null,
      author_id: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Gönderi başarıyla paylaşıldı.',
      data: { post },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, (req, res, next) => {
  try {
    const post = Post.findById(parseInt(req.params.id, 10));

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı.',
      });
    }

    Post.incrementView(post.id);

    return res.json({ success: true, data: { post } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, postRules, validate, (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post   = Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Gönderi bulunamadı.' });
    }

    if (post.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bu gönderiyi düzenleme yetkiniz yok.' });
    }

    const { title, content, media_url } = req.body;
    const updated = Post.update(postId, req.user.id, { title, content, media_url });

    return res.json({
      success: true,
      message: 'Gönderi güncellendi.',
      data: { post: updated },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post   = Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Gönderi bulunamadı.' });
    }

    const isOwner = post.author_id === req.user.id;
    const isMod   = ['moderator', 'admin'].includes(req.user.role);

    if (!isOwner && !isMod) {
      return res.status(403).json({ success: false, message: 'Bu gönderiyi silme yetkiniz yok.' });
    }

    Post.remove(postId, post.author_id);

    return res.json({ success: true, message: 'Gönderi silindi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;