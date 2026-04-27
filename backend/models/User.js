'use strict';

const bcrypt  = require('bcryptjs');
const { getDb } = require('../config/db');

const SALT_ROUNDS = 12;

function sanitize(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

async function findById(id) {
  const pool = getDb();
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function findByEmail(email) {
  const pool = getDb();
  const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return res.rows[0] || null;
}

async function findByUsername(username) {
  const pool = getDb();
  const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return res.rows[0] || null;
}

async function create({ username, email, password, display_name }) {
  const pool = getDb();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const res = await pool.query(
    'INSERT INTO users (username, email, password, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, email, hash, display_name || null]
  );

  return res.rows[0];
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

async function updateProfile(id, fields) {
  const allowed = ['display_name', 'bio', 'avatar_url'];
  const updates = [];
  const values  = [];
  let i = 1;

  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      updates.push(`${k} = $${i++}`);
      values.push(v);
    }
  }

  if (!updates.length) return findById(id);

  values.push(id);
  const pool = getDb();
  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);
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