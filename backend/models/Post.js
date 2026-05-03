'use strict';

const { getDb } = require('../config/db');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const POST_WITH_AUTHOR = `
  SELECT
    p.*,
    u.username AS author_username,
    u.display_name AS author_display_name,
    u.avatar_url AS author_avatar_url,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_hidden = 0)::int AS comment_count
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

const MEDIA_PATTERN = 'https?://[^[:space:]]*(youtube|youtu\\.be|instagram|facebook|fb\\.watch)';

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeOffset(offset) {
  const parsed = Number.parseInt(offset, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function orderBy(sort) {
  switch (sort) {
    case 'popular':
      return 'p.like_count DESC, p.view_count DESC, p.created_at DESC';
    case 'discussed':
      return 'comment_count DESC, p.created_at DESC';
    default:
      return 'p.created_at DESC';
  }
}

function buildFilters({ authorId, search, hasMedia } = {}) {
  const clauses = ['p.is_published = 1'];
  const values = [];

  if (authorId) {
    values.push(authorId);
    clauses.push(`p.author_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(p.title ILIKE $${values.length} OR p.content ILIKE $${values.length} OR u.username ILIKE $${values.length})`);
  }

  if (hasMedia) {
    values.push(MEDIA_PATTERN);
    clauses.push(`(p.media_url IS NOT NULL OR p.content ~* $${values.length})`);
  }

  return { where: clauses.join(' AND '), values };
}

async function findById(id) {
  const pool = getDb();
  const res = await pool.query(
    `${POST_WITH_AUTHOR} WHERE p.id = $1 AND p.is_published = 1`,
    [id]
  );
  return res.rows[0] || null;
}

async function list({ limit = DEFAULT_LIMIT, offset = 0, authorId, search, sort, hasMedia } = {}) {
  const pool = getDb();
  const cap = normalizeLimit(limit);
  const off = normalizeOffset(offset);
  const { where, values } = buildFilters({ authorId, search, hasMedia });

  values.push(cap, off);

  const res = await pool.query(
    `${POST_WITH_AUTHOR} WHERE ${where} ORDER BY ${orderBy(sort)} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return res.rows;
}

async function count({ authorId, search, hasMedia } = {}) {
  const pool = getDb();
  const { where, values } = buildFilters({ authorId, search, hasMedia });
  const res = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE ${where}`,
    values
  );
  return res.rows[0].n;
}

async function create({ title, content, media_url, author_id }) {
  const pool = getDb();
  const res = await pool.query(
    'INSERT INTO posts (title, content, media_url, author_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [title, content, media_url || null, author_id]
  );
  return findById(res.rows[0].id);
}

async function update(id, authorId, { title, content, media_url }) {
  const pool = getDb();
  await pool.query(
    `UPDATE posts SET
      title = $1,
      content = $2,
      media_url = COALESCE($3, media_url),
      updated_at = NOW()
    WHERE id = $4 AND author_id = $5`,
    [title, content, media_url || null, id, authorId]
  );
  return findById(id);
}

async function remove(id, authorId) {
  const pool = getDb();
  return pool.query('DELETE FROM posts WHERE id = $1 AND author_id = $2', [id, authorId]);
}

async function incrementView(id) {
  const pool = getDb();
  await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [id]);
}

module.exports = { findById, list, count, create, update, remove, incrementView };

