'use strict';

const { getDb } = require('../config/db');

const COMMENT_WITH_AUTHOR = `
  SELECT
    c.*,
    u.username      AS author_username,
    u.display_name  AS author_display_name,
    u.avatar_url    AS author_avatar_url
  FROM comments c
  JOIN users u ON u.id = c.author_id
`;

async function findById(id) {
  const pool = getDb();
  const res = await pool.query(
    `${COMMENT_WITH_AUTHOR} WHERE c.id = $1 AND c.is_hidden = 0`,
    [id]
  );
  return res.rows[0] || null;
}

async function listByPost(postId) {
  const pool = getDb();
  const res = await pool.query(
    `${COMMENT_WITH_AUTHOR} WHERE c.post_id = $1 AND c.is_hidden = 0 ORDER BY c.created_at ASC`,
    [postId]
  );

  const all   = res.rows;
  const roots = [];
  const byId  = {};

  for (const comment of all) {
    byId[comment.id] = { ...comment, replies: [] };
  }

  for (const comment of all) {
    if (comment.parent_id && byId[comment.parent_id]) {
      byId[comment.parent_id].replies.push(byId[comment.id]);
    } else {
      roots.push(byId[comment.id]);
    }
  }

  return roots;
}

async function countByPost(postId) {
  const pool = getDb();
  const res = await pool.query(
    'SELECT COUNT(*)::int AS n FROM comments WHERE post_id = $1 AND is_hidden = 0',
    [postId]
  );
  return res.rows[0].n;
}

async function create({ content, post_id, author_id, parent_id }) {
  const pool = getDb();

  if (parent_id) {
    const parent = await pool.query('SELECT post_id FROM comments WHERE id = $1', [parent_id]);
    if (!parent.rows[0] || parent.rows[0].post_id !== post_id) {
      const err = new Error('Geçersiz üst yorum.');
      err.status = 400;
      throw err;
    }
  }

  const res = await pool.query(
    'INSERT INTO comments (content, post_id, author_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [content, post_id, author_id, parent_id || null]
  );

  return findById(res.rows[0].id);
}

async function update(id, authorId, { content }) {
  const pool = getDb();
  await pool.query(
    'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2 AND author_id = $3',
    [content, id, authorId]
  );
  return findById(id);
}

async function remove(id, authorId) {
  const pool = getDb();
  return pool.query('DELETE FROM comments WHERE id = $1 AND author_id = $2', [id, authorId]);
}

module.exports = { findById, listByPost, countByPost, create, update, remove };