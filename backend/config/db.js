'use strict';

const { Pool } = require('pg');

let _pool = null;

function getDb() {
  if (_pool) return _pool;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL tanimli degil.');
  }

  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  return _pool;
}

module.exports = { getDb };
