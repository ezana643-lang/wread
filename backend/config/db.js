'use strict';

const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

let _db = null;

function getDb() {
  if (_db) return _db;

  const dbPath = path.resolve(process.env.DB_PATH || './database/wread.db');
  const dbDir  = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(dbPath);

  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');

  return _db;
}

module.exports = { getDb };