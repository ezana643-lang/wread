'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');

const Post  = require('../models/Post');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const postRules = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Başlık 3–200 karakter olmalıdır.'),
  body('content').trim().isLength({ min: 10 }).withMessage('İçerik en az 10 karakter olmalıdır.'),
  body('media_url').optional({ nullable: true }).isURL().withMessage('Geçerli bir URL girin.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Doğrulama hatası.', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const limit    = parseInt(req.query.limit, 10)  || 20;
    const offset   = parseInt(req.query.offset, 10) || 0;
    const authorId = req.query.author_id ? parseInt(req.query.author_id, 10) : undefined;
    const search   = req.query.search || '';

    const posts = await Post.list({ limit, offset, authorId, search });
    const total = await Post.count({ authorId, search });

    return res.json({ success: true, data: { posts, pagination: { total, limit, offset, hasMore: offset + limit < total } } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, postRules, validate, async (req, res, next) => {
  try {
    const { title, content, media_url } = req.body;
    const post = await Post.create({ title, content, media_url: media_url || null, author_id: req.user.id });
    return res.status(201).json({ success: true, message: 'Gönderi başarıyla paylaşıldı.', data: { post } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(parseInt(req.params.id, 10));
    if (!post) return res.status(404).json({ success: false, message: 'Gönderi bulunamadı.' });
    Post.incrementView(post.id);
    return res.json({ success: true, data: { post } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, postRules, validate, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post   = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Gönderi bulunamadı.' });
    if (post.author_id !== req.user.id) return res.status(403).json({ success: false, message: 'Bu gönderiyi düzenleme yetkiniz yok.' });
    const { title, content, media_url } = req.body;
    const updated = await Post.update(postId, req.user.id, { title, content, media_url });
    return res.json({ success: true, message: 'Gönderi güncellendi.', data: { post: updated } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post   = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Gönderi bulunamadı.' });
    const isOwner = post.author_id === req.user.id;
    const isMod   = ['moderator', 'admin'].includes(req.user.role);
    if (!isOwner && !isMod) return res.status(403).json({ success: false, message: 'Bu gönderiyi silme yetkiniz yok.' });
    await Post.remove(postId, post.author_id);
    return res.json({ success: true, message: 'Gönderi silindi.' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const pool = require('../config/db').getDb();

    const check = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, req.user.id]
    );

    if (check.rows.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, req.user.id]);
      await pool.query('UPDATE posts SET like_count = like_count - 1 WHERE id = $1', [postId]);
      return res.json({ success: true, liked: false });
    } else {
      await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [postId, req.user.id]);
      await pool.query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [postId]);
      return res.json({ success: true, liked: true });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;