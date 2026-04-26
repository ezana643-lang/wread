'use strict';

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './database/wread.db';
const SCHEMA   = path.join(__dirname, 'schema.sql');

function init() {
  const dbDir = path.dirname(path.resolve(DB_PATH));
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new Database(path.resolve(DB_PATH));

  const sql = fs.readFileSync(SCHEMA, 'utf8');
  db.exec(sql);

  console.log(`✔  Veritabanı başarıyla oluşturuldu → ${path.resolve(DB_PATH)}`);
  db.close();
}

try {
  init();
} catch (err) {
  console.error('✖  Veritabanı başlatma hatası:', err.message);
  process.exit(1);
}