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
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_hidden = 0)
      AS comment_count
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

function findById(id) {
  return getDb()
    .prepare(`${POST_WITH_AUTHOR} WHERE p.id = ? AND p.is_published = 1`)
    .get(id);
}

function list({ limit = DEFAULT_LIMIT, offset = 0, authorId } = {}) {
  const db  = getDb();
  const cap = Math.min(Number(limit), MAX_LIMIT);
  const off = Math.max(Number(offset), 0);

  if (authorId) {
    return db
      .prepare(`${POST_WITH_AUTHOR} WHERE p.author_id = ? AND p.is_published = 1 ORDER BY p.created_at DESC LIMIT ? OFFSET ?`)
      .all(authorId, cap, off);
  }

  return db
    .prepare(`${POST_WITH_AUTHOR} WHERE p.is_published = 1 ORDER BY p.created_at DESC LIMIT ? OFFSET ?`)
    .all(cap, off);
}

function count({ authorId } = {}) {
  const db = getDb();
  if (authorId) {
    return db.prepare('SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND is_published = 1').get(authorId).n;
  }
  return db.prepare('SELECT COUNT(*) AS n FROM posts WHERE is_published = 1').get().n;
}

function create({ title, content, media_url, author_id }) {
  const db     = getDb();
  const result = db.prepare(
    'INSERT INTO posts (title, content, media_url, author_id) VALUES (?, ?, ?, ?)'
  ).run(title, content, media_url || null, author_id);

  return findById(result.lastInsertRowid);
}

function update(id, authorId, { title, content, media_url }) {
  const db = getDb();
  db.prepare(`
    UPDATE posts
    SET title = COALESCE(?, title),
        content = COALESCE(?, content),
        media_url = COALESCE(?, media_url)
    WHERE id = ? AND author_id = ?
  `).run(title || null, content || null, media_url || null, id, authorId);

  return findById(id);
}

function remove(id, authorId) {
  return getDb()
    .prepare('DELETE FROM posts WHERE id = ? AND author_id = ?')
    .run(id, authorId);
}

function incrementView(id) {
  getDb().prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(id);
}

module.exports = { findById, list, count, create, update, remove, incrementView };