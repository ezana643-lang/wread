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

function findById(id) {
  return getDb()
    .prepare(`${COMMENT_WITH_AUTHOR} WHERE c.id = ? AND c.is_hidden = 0`)
    .get(id);
}

function listByPost(postId) {
  const db = getDb();

  const all = db
    .prepare(`${COMMENT_WITH_AUTHOR} WHERE c.post_id = ? AND c.is_hidden = 0 ORDER BY c.created_at ASC`)
    .all(postId);

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

function countByPost(postId) {
  return getDb()
    .prepare('SELECT COUNT(*) AS n FROM comments WHERE post_id = ? AND is_hidden = 0')
    .get(postId).n;
}

function create({ content, post_id, author_id, parent_id }) {
  const db = getDb();

  if (parent_id) {
    const parent = db.prepare('SELECT post_id FROM comments WHERE id = ?').get(parent_id);
    if (!parent || parent.post_id !== post_id) {
      const err = new Error('Geçersiz üst yorum.');
      err.status = 400;
      throw err;
    }
  }

  const result = db.prepare(
    'INSERT INTO comments (content, post_id, author_id, parent_id) VALUES (?, ?, ?, ?)'
  ).run(content, post_id, author_id, parent_id || null);

  return findById(result.lastInsertRowid);
}

function update(id, authorId, { content }) {
  getDb()
    .prepare('UPDATE comments SET content = ? WHERE id = ? AND author_id = ?')
    .run(content, id, authorId);
  return findById(id);
}

function remove(id, authorId) {
  return getDb()
    .prepare('DELETE FROM comments WHERE id = ? AND author_id = ?')
    .run(id, authorId);
}

module.exports = { findById, listByPost, countByPost, create, update, remove };