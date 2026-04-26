'use strict';

const bcrypt  = require('bcryptjs');
const { getDb } = require('../config/db');

const SALT_ROUNDS = 12;

function sanitize(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function findById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

async function create({ username, email, password, display_name }) {
  const db   = getDb();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = db.prepare(`
    INSERT INTO users (username, email, password, display_name)
    VALUES (?, ?, ?, ?)
  `).run(username, email, hash, display_name || null);

  return findById(result.lastInsertRowid);
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

function updateProfile(id, fields) {
  const allowed = ['display_name', 'bio', 'avatar_url'];
  const updates = Object.entries(fields)
    .filter(([k]) => allowed.includes(k))
    .map(([k]) => `${k} = ?`);

  if (!updates.length) return findById(id);

  const values = Object.entries(fields)
    .filter(([k]) => allowed.includes(k))
    .map(([, v]) => v);

  getDb()
    .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .run(...values, id);

  return findById(id);
}

module.exports = {
  findById,
  findByEmail,
  findByUsername,
  create,
  verifyPassword,
  updateProfile,
  sanitize,
};