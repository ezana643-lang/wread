'use strict';

const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');

const Post    = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const commentRules = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Yorum 1–2000 karakter arasında olmalıdır.'),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Geçersiz üst yorum kimliği.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Doğrulama hatası.', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
}

async function resolvePost(req, res, next) {
  const post = await Post.findById(parseInt(req.params.postId, 10));
  if (!post) return res.status(404).json({ success: false, message: 'Gönderi bulunamadı.' });
  req.post = post;
  next();
}

router.get('/', optionalAuth, resolvePost, async (req, res, next) => {
  try {
    const comments = await Comment.listByPost(req.post.id);
    const total    = await Comment.countByPost(req.post.id);
    return res.json({ success: true, data: { comments, total } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, resolvePost, commentRules, validate, async (req, res, next) => {
  try {
    const { content, parent_id } = req.body;
    const comment = await Comment.create({ content, post_id: req.post.id, author_id: req.user.id, parent_id: parent_id ? parseInt(parent_id, 10) : null });
    return res.status(201).json({ success: true, message: 'Yorumunuz eklendi.', data: { comment } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, resolvePost, commentRules, validate, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const comment   = await Comment.findById(commentId);
    if (!comment || comment.post_id !== req.post.id) return res.status(404).json({ success: false, message: 'Yorum bulunamadı.' });
    if (comment.author_id !== req.user.id) return res.status(403).json({ success: false, message: 'Bu yorumu düzenleme yetkiniz yok.' });
    const updated = await Comment.update(commentId, req.user.id, { content: req.body.content });
    return res.json({ success: true, message: 'Yorum güncellendi.', data: { comment: updated } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, resolvePost, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const comment   = await Comment.findById(commentId);
    if (!comment || comment.post_id !== req.post.id) return res.status(404).json({ success: false, message: 'Yorum bulunamadı.' });
    const isOwner = comment.author_id === req.user.id;
    const isMod   = ['moderator', 'admin'].includes(req.user.role);
    if (!isOwner && !isMod) return res.status(403).json({ success: false, message: 'Bu yorumu silme yetkiniz yok.' });
    await Comment.remove(commentId, comment.author_id);
    return res.json({ success: true, message: 'Yorum silindi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;