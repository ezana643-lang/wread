'use strict';

require('dotenv').config();
const { getDb } = require('../config/db');

async function init() {
  const pool = getDb();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      username    TEXT    NOT NULL UNIQUE,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      display_name TEXT,
      bio          TEXT,
      avatar_url   TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      role        TEXT    NOT NULL DEFAULT 'member',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          SERIAL PRIMARY KEY,
      title       TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      media_url   TEXT,
      author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_published INTEGER NOT NULL DEFAULT 1,
      view_count   INTEGER NOT NULL DEFAULT 0,
      like_count   INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          SERIAL PRIMARY KEY,
      content     TEXT    NOT NULL,
      post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id   INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      is_hidden   INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT    NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✔  Veritabanı başarıyla oluşturuldu.');
  await pool.end();
}

init().catch(err => {
  console.error('✖  Hata:', err.message);
  process.exit(1);
});