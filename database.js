const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'gym.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    peso REAL,
    biceps_contraido REAL,
    biceps_relaxado REAL,
    antebraco REAL,
    ombro_bustos REAL,
    peito REAL,
    cintura_buxinho REAL,
    cintura_umbigo REAL,
    coxa_superior REAL,
    coxa_inferior REAL,
    panturrilha REAL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    sexo TEXT DEFAULT '',
    idade INTEGER,
    altura INTEGER,
    freq INTEGER,
    calorias INTEGER,
    rotina TEXT DEFAULT ''
  )
`);

db.exec(`INSERT OR IGNORE INTO profile (id) VALUES (1)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS water_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    bottle_size_ml INTEGER DEFAULT 500,
    daily_goal_ml INTEGER DEFAULT 3000
  )
`);

db.exec(`INSERT OR IGNORE INTO water_config (id) VALUES (1)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS water_intake (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    bottles REAL NOT NULL DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS treino (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    rating INTEGER NOT NULL DEFAULT 3,
    notes TEXT DEFAULT ''
  )
`);

module.exports = db;
