const Database = require('better-sqlite3');
const path = require('path');
const { hashPassword } = require('./auth');

const dbPath = path.join(__dirname, 'data', 'gym.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function tableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

// ======== USUÁRIOS ========

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Primeiro usuário (dono): herda as credenciais AUTH_USER/AUTH_PASS e todos os dados
// que existiam antes do sistema virar multi-usuário.
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  const username = process.env.AUTH_USER || 'admin';
  const password = process.env.AUTH_PASS || 'admin';
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, hashPassword(password));
}

function getLegacyUserId() {
  return db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get().id;
}

// ======== TABELAS (esquema novo, por usuário) ========

db.exec(`
  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
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

const CREATE_PROFILE = `
  CREATE TABLE IF NOT EXISTS profile (
    user_id INTEGER PRIMARY KEY,
    sexo TEXT DEFAULT '',
    idade INTEGER,
    altura INTEGER,
    freq INTEGER,
    calorias INTEGER,
    rotina TEXT DEFAULT '',
    peso_meta REAL
  )
`;
db.exec(CREATE_PROFILE);

const CREATE_WATER_CONFIG = `
  CREATE TABLE IF NOT EXISTS water_config (
    user_id INTEGER PRIMARY KEY,
    bottle_size_ml INTEGER DEFAULT 500,
    daily_goal_ml INTEGER DEFAULT 3000
  )
`;
db.exec(CREATE_WATER_CONFIG);

const CREATE_WATER_INTAKE = `
  CREATE TABLE IF NOT EXISTS water_intake (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT NOT NULL,
    bottles REAL NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
  )
`;
db.exec(CREATE_WATER_INTAKE);

const CREATE_TREINO = `
  CREATE TABLE IF NOT EXISTS treino (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 3,
    notes TEXT DEFAULT '',
    musculacao INTEGER DEFAULT 0,
    corrida INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
  )
`;
db.exec(CREATE_TREINO);

db.exec(`
  CREATE TABLE IF NOT EXISTS progressao_carga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT NOT NULL,
    exercise TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 0,
    sets INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0
  )
`);

// ======== MIGRAÇÕES (banco antigo, dado único -> por usuário) ========

// measurements e progressao_carga: basta adicionar a coluna e atribuir ao dono
(function migrateUserColumns() {
  for (const table of ['measurements', 'progressao_carga']) {
    if (!tableColumns(table).includes('user_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`);
      db.prepare(`UPDATE ${table} SET user_id = ?`).run(getLegacyUserId());
    }
  }
})();

// profile: era linha única (id = 1); vira uma linha por usuário
(function migrateProfile() {
  const cols = tableColumns('profile');
  if (!cols.includes('id')) return;
  const old = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  db.exec('DROP TABLE profile');
  db.exec(CREATE_PROFILE);
  if (old) {
    db.prepare(`
      INSERT INTO profile (user_id, sexo, idade, altura, freq, calorias, rotina, peso_meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      getLegacyUserId(),
      old.sexo || '', old.idade, old.altura, old.freq, old.calorias,
      old.rotina || '', old.peso_meta != null ? old.peso_meta : null
    );
  }
})();

// water_config: era linha única (id = 1); vira uma linha por usuário
(function migrateWaterConfig() {
  const cols = tableColumns('water_config');
  if (!cols.includes('id')) return;
  const old = db.prepare('SELECT * FROM water_config WHERE id = 1').get();
  db.exec('DROP TABLE water_config');
  db.exec(CREATE_WATER_CONFIG);
  if (old) {
    db.prepare('INSERT INTO water_config (user_id, bottle_size_ml, daily_goal_ml) VALUES (?, ?, ?)')
      .run(getLegacyUserId(), old.bottle_size_ml, old.daily_goal_ml);
  }
})();

// water_intake: UNIQUE(date) vira UNIQUE(user_id, date) — precisa recriar a tabela
(function migrateWaterIntake() {
  if (tableColumns('water_intake').includes('user_id')) return;
  db.exec('ALTER TABLE water_intake RENAME TO water_intake_old');
  db.exec(CREATE_WATER_INTAKE);
  db.prepare('INSERT INTO water_intake (user_id, date, bottles) SELECT ?, date, bottles FROM water_intake_old')
    .run(getLegacyUserId());
  db.exec('DROP TABLE water_intake_old');
})();

// treino: UNIQUE(date) vira UNIQUE(user_id, date) — precisa recriar a tabela
(function migrateTreino() {
  const cols = tableColumns('treino');
  if (cols.includes('user_id')) return;
  if (!cols.includes('musculacao')) {
    db.exec('ALTER TABLE treino ADD COLUMN musculacao INTEGER DEFAULT 0');
    db.exec('UPDATE treino SET musculacao = 1 WHERE rating > 0');
  }
  if (!cols.includes('corrida')) {
    db.exec('ALTER TABLE treino ADD COLUMN corrida INTEGER DEFAULT 0');
  }
  db.exec('ALTER TABLE treino RENAME TO treino_old');
  db.exec(CREATE_TREINO);
  db.prepare(`
    INSERT INTO treino (user_id, date, rating, notes, musculacao, corrida)
    SELECT ?, date, rating, notes, musculacao, corrida FROM treino_old
  `).run(getLegacyUserId());
  db.exec('DROP TABLE treino_old');
})();

// Garante que o usuário tenha as linhas de perfil e config de água
function ensureUserRows(userId) {
  db.prepare('INSERT OR IGNORE INTO profile (user_id) VALUES (?)').run(userId);
  db.prepare('INSERT OR IGNORE INTO water_config (user_id) VALUES (?)').run(userId);
}

module.exports = { db, ensureUserRows };
