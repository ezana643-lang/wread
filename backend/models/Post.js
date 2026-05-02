'use strict';

const { getDb } = require('../config/db');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

const POST_WITH_AUTHOR = `
  SELECT
    p.*,
    u.username      AS author_username,
    u.display_name  AS author_display_name,
    u.avatar_url    AS author_avatar_url,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_hidden = 0)::int
      AS comment_count
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

async function findById(id) {
  const pool = getDb();
  const res = await pool.query(
    `${POST_WITH_AUTHOR} WHERE p.id = $1 AND p.is_published = 1`,
    [id]
  );
  return res.rows[0] || null;
}

async function list({ limit = DEFAULT_LIMIT, offset = 0, authorId, search } = {}) {
  const pool = getDb();
  const cap = Math.min(Number(limit), MAX_LIMIT);
  const off = Math.max(Number(offset), 0);

  if (search) {
    const res = await pool.query(
      `${POST_WITH_AUTHOR} WHERE p.is_published = 1 AND (p.title ILIKE $1 OR p.content ILIKE $1) ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [`%${search}%`, cap, off]
    );
    return res.rows;
  }

  if (authorId) {
    const res = await pool.query(
      `${POST_WITH_AUTHOR} WHERE p.author_id = $1 AND p.is_published = 1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [authorId, cap, off]
    );
    return res.rows;
  }

  const res = await pool.query(
    `${POST_WITH_AUTHOR} WHERE p.is_published = 1 ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
    [cap, off]
  );
  return res.rows;
}

async function count({ authorId, search } = {}) {
  const pool = getDb();
  if (search) {
    const res = await pool.query(
      'SELECT COUNT(*)::int AS n FROM posts WHERE is_published = 1 AND (title ILIKE $1 OR content ILIKE $1)',
      [`%${search}%`]
    );
    return res.rows[0].n;
  }
  if (authorId) {
    const res = await pool.query(
      'SELECT COUNT(*)::int AS n FROM posts WHERE author_id = $1 AND is_published = 1',
      [authorId]
    );
    return res.rows[0].n;
  }
  const res = await pool.query('SELECT COUNT(*)::int AS n FROM posts WHERE is_published = 1');
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
      title     = COALESCE($1, title),
      content   = COALESCE($2, content),
      media_url = COALESCE($3, media_url),
      updated_at = NOW()
    WHERE id = $4 AND author_id = $5`,
    [title || null, content || null, media_url || null, id, authorId]
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