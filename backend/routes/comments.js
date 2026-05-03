'use strict';

const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');

const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const commentRules = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Yorum 1-2000 karakter arasinda olmalidir.'),
  body('parent_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Gecersiz ust yorum kimligi.'),
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

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function resolvePost(req, res, next) {
  try {
    const postId = parsePositiveInt(req.params.postId);
    if (!postId) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    req.post = post;
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/', optionalAuth, resolvePost, async (req, res, next) => {
  try {
    const comments = await Comment.listByPost(req.post.id);
    const total = await Comment.countByPost(req.post.id);
    return res.json({ success: true, data: { comments, total } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, resolvePost, commentRules, validate, async (req, res, next) => {
  try {
    const { content, parent_id } = req.body;
    const comment = await Comment.create({
      content: content.trim(),
      post_id: req.post.id,
      author_id: req.user.id,
      parent_id: parent_id ? parsePositiveInt(parent_id) : null,
    });

    return res.status(201).json({ success: true, message: 'Yorumunuz eklendi.', data: { comment } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, resolvePost, commentRules, validate, async (req, res, next) => {
  try {
    const commentId = parsePositiveInt(req.params.id);
    if (!commentId) return res.status(404).json({ success: false, message: 'Yorum bulunamadi.' });

    const comment = await Comment.findById(commentId);
    if (!comment || comment.post_id !== req.post.id) {
      return res.status(404).json({ success: false, message: 'Yorum bulunamadi.' });
    }

    if (comment.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bu yorumu duzenleme yetkiniz yok.' });
    }

    const updated = await Comment.update(commentId, req.user.id, { content: req.body.content.trim() });
    return res.json({ success: true, message: 'Yorum guncellendi.', data: { comment: updated } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, resolvePost, async (req, res, next) => {
  try {
    const commentId = parsePositiveInt(req.params.id);
    if (!commentId) return res.status(404).json({ success: false, message: 'Yorum bulunamadi.' });

    const comment = await Comment.findById(commentId);
    if (!comment || comment.post_id !== req.post.id) {
      return res.status(404).json({ success: false, message: 'Yorum bulunamadi.' });
    }

    const isOwner = comment.author_id === req.user.id;
    const isMod = ['moderator', 'admin'].includes(req.user.role);
    if (!isOwner && !isMod) {
      return res.status(403).json({ success: false, message: 'Bu yorumu silme yetkiniz yok.' });
    }

    await Comment.remove(commentId, comment.author_id);
    return res.json({ success: true, message: 'Yorum silindi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

