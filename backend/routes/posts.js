'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');

const { upload, uploadToCloudinary } = require('../upload');
const Post = require('../models/Post');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getDb } = require('../config/db');

const MAX_LIMIT = 50;
const SORTS = new Set(['newest', 'popular', 'discussed']);

const postRules = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Baslik 3-200 karakter arasinda olmalidir.'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 20000 })
    .withMessage('Icerik 10-20000 karakter arasinda olmalidir.'),
  body('media_url')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Gecerli bir http veya https URL girin.'),
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

function parseBoolean(value) {
  return value === '1' || value === 'true' || value === true;
}

function cleanSearch(value) {
  return String(value || '').trim().slice(0, 120);
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit) || 20, MAX_LIMIT);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const authorId = req.query.author_id ? parsePositiveInt(req.query.author_id) : undefined;
    const search = cleanSearch(req.query.search);
    const sort = SORTS.has(req.query.sort) ? req.query.sort : 'newest';
    const hasMedia = parseBoolean(req.query.has_media);

    if (req.query.author_id && !authorId) {
      return res.status(422).json({ success: false, message: 'Gecersiz yazar kimligi.' });
    }

    const filters = { limit, offset, authorId, search, sort, hasMedia };
    const posts = await Post.list(filters);
    const total = await Post.count(filters);

    return res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, upload.single('image'), postRules, validate, async (req, res, next) => {
  try {
    const title = req.body.title.trim();
    const content = req.body.content.trim();
    let media_url = req.body.media_url?.trim() || null;

    if (req.file) {
      media_url = await uploadToCloudinary(req.file.buffer);
    }

    const post = await Post.create({ title, content, media_url, author_id: req.user.id });
    return res.status(201).json({
      success: true,
      message: 'Gonderi basariyla paylasildi.',
      data: { post },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const postId = parsePositiveInt(req.params.id);
    if (!postId) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    await Post.incrementView(post.id);
    return res.json({ success: true, data: { post: { ...post, view_count: Number(post.view_count || 0) + 1 } } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, postRules, validate, async (req, res, next) => {
  try {
    const postId = parsePositiveInt(req.params.id);
    if (!postId) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bu gonderiyi duzenleme yetkiniz yok.' });
    }

    const updated = await Post.update(postId, req.user.id, {
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      media_url: req.body.media_url?.trim() || null,
    });

    return res.json({ success: true, message: 'Gonderi guncellendi.', data: { post: updated } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const postId = parsePositiveInt(req.params.id);
    if (!postId) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

    const isOwner = post.author_id === req.user.id;
    const isMod = ['moderator', 'admin'].includes(req.user.role);
    if (!isOwner && !isMod) {
      return res.status(403).json({ success: false, message: 'Bu gonderiyi silme yetkiniz yok.' });
    }

    await Post.remove(postId, post.author_id);
    return res.json({ success: true, message: 'Gonderi silindi.' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/like', requireAuth, async (req, res, next) => {
  const postId = parsePositiveInt(req.params.id);
  if (!postId) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ success: false, message: 'Gonderi bulunamadi.' });

  const pool = getDb();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const check = await client.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, req.user.id]
    );

    if (check.rows.length > 0) {
      await client.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, req.user.id]);
      await client.query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [postId]);
      await client.query('COMMIT');
      return res.json({ success: true, liked: false });
    }

    await client.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [postId, req.user.id]);
    await client.query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [postId]);
    await client.query('COMMIT');
    return res.json({ success: true, liked: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;

