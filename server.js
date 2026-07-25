const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, ensureUserRows } = require('./database');
const { hashPassword, verifyPassword } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3010;

const SESSION_SECRET = process.env.SESSION_SECRET || 'gym-evolution-secret-change-me';

app.use(express.json({ limit: '2mb' })); // avatar em base64 no perfil
app.use(express.urlencoded({ extended: false }));

// Sessões persistidas no SQLite: sobrevivem a restarts/deploys do container
class SqliteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.db = database;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      )
    `);
    setInterval(() => {
      try { this.db.prepare('DELETE FROM sessions WHERE expire < ?').run(Date.now()); } catch {}
    }, 60 * 60 * 1000).unref();
  }
  get(sid, cb) {
    try {
      const row = this.db.prepare('SELECT sess, expire FROM sessions WHERE sid = ?').get(sid);
      if (!row || row.expire < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.sess));
    } catch (e) { cb(e); }
  }
  set(sid, sess, cb) {
    try {
      const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 30 * 24 * 60 * 60 * 1000;
      this.db.prepare(`
        INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
      `).run(sid, JSON.stringify(sess), Date.now() + maxAge);
      if (cb) cb(null);
    } catch (e) { if (cb) cb(e); }
  }
  destroy(sid, cb) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      if (cb) cb(null);
    } catch (e) { if (cb) cb(e); }
  }
  touch(sid, sess, cb) {
    this.set(sid, sess, cb);
  }
}

app.use(session({
  store: new SqliteSessionStore(db),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    httpOnly: true,
  },
}));

app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));

// Rotas públicas (login e cadastro)
app.get('/login.html', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Usuário deve ter de 3 a 20 caracteres (letras, números, ponto, hífen ou underline)' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres' });
  }

  try {
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, hashPassword(password));
    ensureUserRows(result.lastInsertRowid);
    req.session.userId = result.lastInsertRowid;
    req.session.username = username;
    res.status(201).json({ success: true, username });
  } catch (err) {
    if (err && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'Este nome de usuário já está em uso' });
    }
    throw err;
  }
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  ensureUserRows(user.id);
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Assets estáticos são públicos (necessário para o service worker/manifest do PWA);
// os dados continuam protegidos nas APIs e o index atrás do requireAuth.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  res.redirect('/login.html');
}

// Proteger tudo abaixo
app.use(requireAuth);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Usuário logado
app.get('/api/me', (req, res) => {
  const user = db.prepare('SELECT username, created_at FROM users WHERE id = ?').get(req.session.userId);
  const counts = followCounts(req.session.userId);
  res.json({
    username: req.session.username,
    created_at: user ? user.created_at : null,
    followers: counts.followers,
    following: counts.following,
  });
});

// Listar todas as medições ordenadas por data
app.get('/api/measurements', (req, res) => {
  const rows = db.prepare('SELECT * FROM measurements WHERE user_id = ? ORDER BY date ASC').all(req.session.userId);
  res.json(rows);
});

// Adicionar nova medição
app.post('/api/measurements', (req, res) => {
  const { date, label, peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha } = req.body;

  const stmt = db.prepare(`
    INSERT INTO measurements (user_id, date, label, peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(req.session.userId, date, label || '', peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha);
  const newRow = db.prepare('SELECT * FROM measurements WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newRow);
});

// Editar medição existente
app.put('/api/measurements/:id', (req, res) => {
  const { id } = req.params;
  const { date, label, peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha } = req.body;

  const stmt = db.prepare(`
    UPDATE measurements SET date = ?, label = ?, peso = ?, biceps_contraido = ?, biceps_relaxado = ?, antebraco = ?, ombro_bustos = ?, peito = ?, cintura_buxinho = ?, cintura_umbigo = ?, coxa_superior = ?, coxa_inferior = ?, panturrilha = ?
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(date, label || '', peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha, id, req.session.userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Medição não encontrada' });
  }

  const updated = db.prepare('SELECT * FROM measurements WHERE id = ?').get(id);
  res.json(updated);
});

// Remover medição
app.delete('/api/measurements/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM measurements WHERE id = ? AND user_id = ?').run(id, req.session.userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Medição não encontrada' });
  }

  res.json({ success: true });
});

// Perfil
app.get('/api/profile', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.session.userId);
  res.json(profile || {});
});

app.put('/api/profile', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO profile (user_id) VALUES (?)').run(req.session.userId);
  // Atualização parcial: só sobrescreve os campos presentes no body
  const existing = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.session.userId) || {};
  const pick = (key, fallback) => (req.body[key] !== undefined ? req.body[key] : existing[key]) || fallback;
  db.prepare(`
    UPDATE profile SET sexo = ?, idade = ?, altura = ?, freq = ?, calorias = ?, rotina = ?, peso_meta = ?, avatar = ?
    WHERE user_id = ?
  `).run(
    pick('sexo', ''), pick('idade', null), pick('altura', null), pick('freq', null),
    pick('calorias', null), pick('rotina', ''), pick('peso_meta', null), pick('avatar', ''),
    req.session.userId
  );
  const updated = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.session.userId);
  res.json(updated);
});

// Water config
const DEFAULT_WATER_CONFIG = { bottle_size_ml: 500, daily_goal_ml: 3000 };

function getWaterConfig(userId) {
  return db.prepare('SELECT * FROM water_config WHERE user_id = ?').get(userId) || DEFAULT_WATER_CONFIG;
}

app.get('/api/water-config', (req, res) => {
  res.json(getWaterConfig(req.session.userId));
});

app.put('/api/water-config', (req, res) => {
  const { bottle_size_ml, daily_goal_ml } = req.body;
  db.prepare('INSERT OR IGNORE INTO water_config (user_id) VALUES (?)').run(req.session.userId);
  db.prepare(`
    UPDATE water_config SET bottle_size_ml = ?, daily_goal_ml = ? WHERE user_id = ?
  `).run(bottle_size_ml || 500, daily_goal_ml || 3000, req.session.userId);
  res.json(getWaterConfig(req.session.userId));
});

// Water intake stats (must be before parameterized routes)
app.get('/api/water-intake/stats', (req, res) => {
  const config = getWaterConfig(req.session.userId);
  const goalBottles = config.daily_goal_ml / config.bottle_size_ml;

  const rows = db.prepare('SELECT date, bottles FROM water_intake WHERE user_id = ? ORDER BY date ASC').all(req.session.userId);

  const totalLiters = rows.reduce((sum, r) => sum + r.bottles * config.bottle_size_ml, 0) / 1000;
  const daysTracked = rows.length;
  const averageDaily = daysTracked > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.bottles * config.bottle_size_ml, 0) / daysTracked)
    : 0;

  // Calculate streaks (days meeting goal, counting backwards from today)
  const metGoalDates = new Set(
    rows.filter(r => r.bottles >= goalBottles).map(r => r.date)
  );

  const today = new Date();
  let currentStreak = 0;
  let d = new Date(today);
  while (true) {
    const dateStr = d.toISOString().split('T')[0];
    if (metGoalDates.has(dateStr)) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Best streak
  let bestStreak = 0;
  let streak = 0;
  const sortedDates = [...metGoalDates].sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      streak = diffDays === 1 ? streak + 1 : 1;
    }
    if (streak > bestStreak) bestStreak = streak;
  }

  res.json({ currentStreak, bestStreak, totalLiters: +totalLiters.toFixed(1), daysTracked, averageDaily });
});

// Water intake - list by year
app.get('/api/water-intake', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const rows = db.prepare(
    'SELECT * FROM water_intake WHERE user_id = ? AND date LIKE ? ORDER BY date ASC'
  ).all(req.session.userId, `${year}-%`);
  res.json(rows);
});

// Water intake - upsert
app.post('/api/water-intake', (req, res) => {
  const { date, bottles } = req.body;
  db.prepare(`
    INSERT INTO water_intake (user_id, date, bottles) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET bottles = excluded.bottles
  `).run(req.session.userId, date, bottles);
  const row = db.prepare('SELECT * FROM water_intake WHERE user_id = ? AND date = ?').get(req.session.userId, date);
  res.json(row);
});

// Water intake - delete by date
app.delete('/api/water-intake/:date', (req, res) => {
  const { date } = req.params;
  const result = db.prepare('DELETE FROM water_intake WHERE user_id = ? AND date = ?').run(req.session.userId, date);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }
  res.json({ success: true });
});

// ======== TREINO ========

// Treino stats
app.get('/api/treino/stats', (req, res) => {
  const rows = db.prepare('SELECT date, rating, musculacao, corrida FROM treino WHERE user_id = ? ORDER BY date ASC').all(req.session.userId);
  const totalDays = rows.length;
  const totalMusc = rows.filter(r => r.musculacao).length;
  const totalCorrida = rows.filter(r => r.corrida).length;
  const avgRating = totalDays > 0
    ? +(rows.reduce((sum, r) => sum + r.rating, 0) / totalDays).toFixed(1)
    : 0;

  // Current streak (consecutive days counting backwards from today)
  const allDates = new Set(rows.map(r => r.date));
  const today = new Date();
  let currentStreak = 0;
  let d = new Date(today);
  while (true) {
    const dateStr = d.toISOString().split('T')[0];
    if (allDates.has(dateStr)) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Best streak
  let bestStreak = 0;
  let streak = 0;
  const sortedDates = [...allDates].sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      streak = diffDays === 1 ? streak + 1 : 1;
    }
    if (streak > bestStreak) bestStreak = streak;
  }

  res.json({ currentStreak, bestStreak, totalDays, totalMusc, totalCorrida, avgRating });
});

// Treino - list by year
app.get('/api/treino', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const rows = db.prepare(
    'SELECT * FROM treino WHERE user_id = ? AND date LIKE ? ORDER BY date ASC'
  ).all(req.session.userId, `${year}-%`);
  res.json(rows);
});

// Treino - upsert
app.post('/api/treino', (req, res) => {
  const { date, rating, notes, musculacao, corrida } = req.body;
  const m = musculacao ? 1 : 0;
  const c = corrida ? 1 : 0;
  // If neither activity, delete the record (treat as "no training")
  if (m === 0 && c === 0 && (rating == null || rating === 0)) {
    db.prepare('DELETE FROM treino WHERE user_id = ? AND date = ?').run(req.session.userId, date);
    return res.json({ deleted: true, date });
  }
  const r = rating != null ? rating : (m ? 4 : 0);
  db.prepare(`
    INSERT INTO treino (user_id, date, rating, musculacao, corrida, notes) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET rating = excluded.rating, musculacao = excluded.musculacao, corrida = excluded.corrida, notes = excluded.notes
  `).run(req.session.userId, date, r, m, c, notes || '');
  const row = db.prepare('SELECT * FROM treino WHERE user_id = ? AND date = ?').get(req.session.userId, date);
  res.json(row);
});

// Treino - delete by date
app.delete('/api/treino/:date', (req, res) => {
  const { date } = req.params;
  const result = db.prepare('DELETE FROM treino WHERE user_id = ? AND date = ?').run(req.session.userId, date);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }
  res.json({ success: true });
});

// ======== PROGRESSAO DE CARGA ========

app.get('/api/progressao', (req, res) => {
  const { exercise, year } = req.query;
  let sql = 'SELECT * FROM progressao_carga WHERE user_id = ?';
  const params = [req.session.userId];
  if (exercise) {
    sql += ' AND exercise = ?';
    params.push(exercise);
  }
  if (year) {
    sql += ' AND date LIKE ?';
    params.push(`${year}-%`);
  }
  sql += ' ORDER BY date ASC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/progressao/exercises', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT exercise FROM progressao_carga WHERE user_id = ? ORDER BY exercise ASC').all(req.session.userId);
  res.json(rows.map(r => r.exercise));
});

// Resumo da última sessão de cada exercício (para os cards do plano)
app.get('/api/progressao/summary', (req, res) => {
  const uid = req.session.userId;
  const rows = db.prepare(`
    SELECT pc.exercise, pc.date, MAX(pc.weight) AS top,
           SUM(CASE WHEN pc.set_number >= 1 THEN 1 ELSE 0 END) AS sets
    FROM progressao_carga pc
    JOIN (
      SELECT exercise, MAX(date) AS md FROM progressao_carga WHERE user_id = ? GROUP BY exercise
    ) last ON last.exercise = pc.exercise AND last.md = pc.date
    WHERE pc.user_id = ?
    GROUP BY pc.exercise
  `).all(uid, uid);
  res.json(rows);
});

// Salva a sessão do dia de um exercício (uma linha por série)
app.post('/api/progressao/session', (req, res) => {
  const exercise = String(req.body.exercise || '').trim();
  const date = req.body.date || new Date().toLocaleDateString('en-CA');
  const sets = Array.isArray(req.body.sets) ? req.body.sets : [];
  if (!exercise) return res.status(400).json({ error: 'Exercício é obrigatório' });

  const clean = sets
    .map(s => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps) || 0 }))
    .filter(s => !isNaN(s.weight) && s.weight > 0);
  if (clean.length === 0) return res.status(400).json({ error: 'Informe o peso de pelo menos uma série' });

  const uid = req.session.userId;
  const before = progressSnapshot(uid);
  const prevMax = db.prepare(
    'SELECT COALESCE(MAX(weight), 0) w FROM progressao_carga WHERE user_id = ? AND exercise = ?'
  ).get(uid, exercise).w;

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM progressao_carga WHERE user_id = ? AND exercise = ? AND date = ?')
      .run(uid, exercise, date);
    const ins = db.prepare(
      'INSERT INTO progressao_carga (user_id, date, exercise, weight, sets, reps, set_number) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    clean.forEach((s, i) => ins.run(uid, date, exercise, s.weight, clean.length, s.reps, i + 1));
    // Carga atual do card = top set da sessão
    const top = Math.max(...clean.map(s => s.weight));
    db.prepare(`
      UPDATE plan_items SET current_weight = ?
      WHERE user_id = ? AND exercise_id IN (SELECT id FROM exercise_library WHERE name = ?)
    `).run(top, uid, exercise);
  });
  tx();

  const top = Math.max(...clean.map(s => s.weight));
  if (prevMax > 0 && top > prevMax) {
    notify(uid, 'pr', `pr:${exercise}:${top}`, '🏆', `Novo recorde no ${exercise}!`,
      `${String(top).replace('.', ',')} kg — seu recorde anterior era ${String(prevMax).replace('.', ',')} kg.`);
  }
  emitProgressNotifs(uid, before);

  res.status(201).json({ saved: clean.length, date });
});

app.post('/api/progressao', (req, res) => {
  const { date, exercise, weight, sets, reps } = req.body;
  const result = db.prepare(
    'INSERT INTO progressao_carga (user_id, date, exercise, weight, sets, reps) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.session.userId, date, exercise, weight || 0, sets || 0, reps || 0);
  const row = db.prepare('SELECT * FROM progressao_carga WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/progressao/:id', (req, res) => {
  const { id } = req.params;
  const { date, exercise, weight, sets, reps } = req.body;
  const result = db.prepare(
    'UPDATE progressao_carga SET date = ?, exercise = ?, weight = ?, sets = ?, reps = ? WHERE id = ? AND user_id = ?'
  ).run(date, exercise, weight || 0, sets || 0, reps || 0, id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  const updated = db.prepare('SELECT * FROM progressao_carga WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/progressao/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM progressao_carga WHERE id = ? AND user_id = ?').run(id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ success: true });
});

// ======== CICLO DE TREINO SEMANAL ========

// Biblioteca de exercícios (globais + do usuário)
app.get('/api/library', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM exercise_library
    WHERE user_id IS NULL OR user_id = ?
    ORDER BY muscle ASC, name ASC
  `).all(req.session.userId);
  res.json(rows);
});

app.post('/api/library', (req, res) => {
  const name = String(req.body.name || '').trim();
  const muscle = String(req.body.muscle || '').trim() || 'Outro';
  if (!name) return res.status(400).json({ error: 'Nome do exercício é obrigatório' });
  const result = db.prepare('INSERT INTO exercise_library (user_id, name, muscle, image1, image2) VALUES (?, ?, ?, ?, ?)')
    .run(req.session.userId, name, muscle, String(req.body.image1 || ''), String(req.body.image2 || ''));
  res.status(201).json(db.prepare('SELECT * FROM exercise_library WHERE id = ?').get(result.lastInsertRowid));
});

app.delete('/api/library/:id', (req, res) => {
  const result = db.prepare('DELETE FROM exercise_library WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Só é possível remover exercícios criados por você' });
  res.json({ success: true });
});

// Plano semanal
app.get('/api/plan', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, e.name, e.muscle, e.image1, e.image2
    FROM plan_items p
    JOIN exercise_library e ON e.id = p.exercise_id
    WHERE p.user_id = ?
    ORDER BY p.weekday ASC, p.position ASC, p.id ASC
  `).all(req.session.userId);
  res.json(rows);
});

app.post('/api/plan', (req, res) => {
  const { weekday, exercise_id, scheme } = req.body;
  const wd = parseInt(weekday);
  if (isNaN(wd) || wd < 0 || wd > 6) return res.status(400).json({ error: 'Dia da semana inválido' });
  const ex = db.prepare('SELECT * FROM exercise_library WHERE id = ? AND (user_id IS NULL OR user_id = ?)')
    .get(exercise_id, req.session.userId);
  if (!ex) return res.status(404).json({ error: 'Exercício não encontrado' });
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) AS p FROM plan_items WHERE user_id = ? AND weekday = ?')
    .get(req.session.userId, wd).p;
  const result = db.prepare('INSERT INTO plan_items (user_id, weekday, exercise_id, scheme, position) VALUES (?, ?, ?, ?, ?)')
    .run(req.session.userId, wd, exercise_id, String(scheme || '3 × 10-12'), maxPos + 1);
  const row = db.prepare(`
    SELECT p.*, e.name, e.muscle, e.image1, e.image2 FROM plan_items p
    JOIN exercise_library e ON e.id = p.exercise_id WHERE p.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/plan/:id', (req, res) => {
  const item = db.prepare('SELECT p.*, e.name FROM plan_items p JOIN exercise_library e ON e.id = p.exercise_id WHERE p.id = ? AND p.user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  const scheme = req.body.scheme != null ? String(req.body.scheme) : item.scheme;
  const weight = req.body.current_weight != null && req.body.current_weight !== ''
    ? parseFloat(req.body.current_weight) : item.current_weight;

  db.prepare('UPDATE plan_items SET scheme = ?, current_weight = ? WHERE id = ?').run(scheme, weight, req.params.id);

  // Registra histórico de carga quando o peso muda (aproveita a tabela progressao_carga)
  if (req.body.current_weight != null && req.body.current_weight !== '' && parseFloat(req.body.current_weight) !== item.current_weight) {
    const today = new Date().toLocaleDateString('en-CA');
    db.prepare('INSERT INTO progressao_carga (user_id, date, exercise, weight, sets, reps) VALUES (?, ?, ?, ?, 0, 0)')
      .run(req.session.userId, today, item.name, parseFloat(req.body.current_weight));
  }

  const row = db.prepare(`
    SELECT p.*, e.name, e.muscle, e.image1, e.image2 FROM plan_items p
    JOIN exercise_library e ON e.id = p.exercise_id WHERE p.id = ?
  `).get(req.params.id);
  res.json(row);
});

app.delete('/api/plan/:id', (req, res) => {
  const result = db.prepare('DELETE FROM plan_items WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Item não encontrado' });
  db.prepare('DELETE FROM workout_log WHERE plan_item_id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ success: true });
});

// Log de exercícios concluídos (por data)
app.get('/api/workout-log', (req, res) => {
  const { start, end } = req.query;
  let rows;
  if (start && end) {
    rows = db.prepare('SELECT * FROM workout_log WHERE user_id = ? AND date >= ? AND date <= ?')
      .all(req.session.userId, start, end);
  } else {
    rows = db.prepare('SELECT * FROM workout_log WHERE user_id = ?').all(req.session.userId);
  }
  res.json(rows);
});

app.post('/api/workout-log/toggle', (req, res) => {
  const { date, plan_item_id } = req.body;
  if (!date || !plan_item_id) return res.status(400).json({ error: 'Data e exercício são obrigatórios' });
  const existing = db.prepare('SELECT id FROM workout_log WHERE user_id = ? AND date = ? AND plan_item_id = ?')
    .get(req.session.userId, date, plan_item_id);
  if (existing) {
    db.prepare('DELETE FROM workout_log WHERE id = ?').run(existing.id);
    return res.json({ done: false });
  }
  const before = progressSnapshot(req.session.userId);
  db.prepare('INSERT INTO workout_log (user_id, date, plan_item_id) VALUES (?, ?, ?)')
    .run(req.session.userId, date, plan_item_id);
  emitProgressNotifs(req.session.userId, before);
  res.json({ done: true });
});

// Gamificação: XP, nível e estatísticas
const XP_PER_EXERCISE = 10;
const XP_DAY_BONUS = 30;
const RANKS = ['Frango', 'Iniciante', 'Aprendiz', 'Consistente', 'Dedicado', 'Casca Grossa', 'Maromba', 'Fibrado', 'Trincado', 'Monstro', 'Lenda'];

// ======== NOTIFICAÇÕES ========

function notify(userId, kind, ref, icon, title, body, actorId) {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO notifications (user_id, kind, ref, icon, title, body, actor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, kind, String(ref || ''), icon, title, body || '', actorId || null);
  } catch { /* nunca derruba a ação principal */ }
}

function weekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toLocaleDateString('en-CA'), end: sunday.toLocaleDateString('en-CA') };
}

function weekXpAll() {
  const { start, end } = weekRange();
  return db.prepare('SELECT id, username FROM users').all().map(u => {
    const g = computeGami(u.id);
    const weekLogs = db.prepare(
      'SELECT COUNT(*) n FROM workout_log WHERE user_id = ? AND date >= ? AND date <= ?'
    ).get(u.id, start, end).n;
    const weekBonus = g.completeDates.filter(d => d >= start && d <= end).length * XP_DAY_BONUS;
    return { id: u.id, username: u.username, gami: g, weekXp: weekLogs * XP_PER_EXERCISE + weekBonus };
  });
}

// Compara estado antes/depois de uma ação e gera notificações
function progressSnapshot(uid) {
  return {
    level: computeGami(uid).level,
    unlocked: new Set(buildAchievements(uid).filter(a => a.unlocked).map(a => a.id)),
    week: weekXpAll(),
  };
}

function emitProgressNotifs(uid, before) {
  const g = computeGami(uid);
  // Subiu de nível
  if (g.level > before.level) {
    const rank = RANKS[Math.min(g.level - 1, RANKS.length - 1)];
    notify(uid, 'nivel', `lvl:${g.level}`, '⬆️', `Você subiu para o nível ${g.level}!`, `Novo rank: ${rank}. Continua assim! 💪`);
  }
  // Conquistas novas
  buildAchievements(uid).filter(a => a.unlocked && !before.unlocked.has(a.id)).forEach(a => {
    notify(uid, 'conquista', a.id, a.icon, `Conquista desbloqueada: ${a.title}`, a.desc);
  });
  // Ultrapassagens no ranking da semana
  const after = weekXpAll();
  const meBefore = before.week.find(u => u.id === uid);
  const meAfter = after.find(u => u.id === uid);
  const myName = meAfter ? meAfter.username : '';
  if (meBefore && meAfter) {
    const today = new Date().toLocaleDateString('en-CA');
    after.forEach(u => {
      if (u.id === uid) return;
      const uBefore = before.week.find(x => x.id === u.id);
      if (!uBefore) return;
      const wasAhead = uBefore.weekXp >= meBefore.weekXp && uBefore.weekXp > 0;
      const nowBehind = u.weekXp < meAfter.weekXp;
      if (wasAhead && nowBehind) {
        notify(u.id, 'ranking', `ovr:${today}:${myName}`, '🏃', `${myName} passou você no ranking!`, 'Bora treinar pra recuperar a posição no ranking da semana.', uid);
      }
    });
  }
}

app.get('/api/notifications', (req, res) => {
  const uid = req.session.userId;
  const items = db.prepare(`
    SELECT n.id, n.icon, n.title, n.body, n.created_at, n.read,
           p.avatar AS actor_avatar, au.username AS actor_username
    FROM notifications n
    LEFT JOIN profile p ON p.user_id = n.actor_id
    LEFT JOIN users au ON au.id = n.actor_id
    WHERE n.user_id = ?
    ORDER BY n.id DESC LIMIT 30
  `).all(uid);
  const unread = db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read = 0').get(uid).n;
  res.json({ unread, items });
});

app.post('/api/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.session.userId);
  res.json({ success: true });
});

function weekdayOf(dateStr) {
  // 0=Seg ... 6=Dom
  return (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7;
}

function computeGami(userId) {
  const logs = db.prepare('SELECT date, plan_item_id FROM workout_log WHERE user_id = ?').all(userId);
  const plan = db.prepare('SELECT id, weekday FROM plan_items WHERE user_id = ?').all(userId);
  const planByWeekday = {};
  plan.forEach(p => { planByWeekday[p.weekday] = (planByWeekday[p.weekday] || 0) + 1; });

  const byDate = {};
  logs.forEach(l => {
    (byDate[l.date] = byDate[l.date] || new Set()).add(l.plan_item_id);
  });

  let completeDays = 0;
  const completeDates = [];
  for (const [date, set] of Object.entries(byDate)) {
    const planned = planByWeekday[weekdayOf(date)] || 0;
    if (planned > 0 && set.size >= planned) {
      completeDays++;
      completeDates.push(date);
    }
  }

  const totalExercises = logs.length;
  const xp = totalExercises * XP_PER_EXERCISE + completeDays * XP_DAY_BONUS;

  // Curva de nível: cada nível pede um pouco mais de XP
  let level = 1;
  let remaining = xp;
  let need = 100;
  while (remaining >= need) {
    remaining -= need;
    level++;
    need = 100 + (level - 1) * 50;
  }

  return {
    xp,
    level,
    xpIntoLevel: remaining,
    xpForNext: need,
    totalExercises,
    completeDays,
    completeDates,
  };
}

app.get('/api/gamification', (req, res) => {
  res.json(computeGami(req.session.userId));
});

// ======== RANKING SEMANAL ========

app.get('/api/ranking', (req, res) => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = monday.toLocaleDateString('en-CA');
  const end = sunday.toLocaleDateString('en-CA');

  const users = db.prepare('SELECT id, username FROM users').all();
  const rows = users.map(u => {
    const g = computeGami(u.id);
    const weekLogs = db.prepare(
      'SELECT COUNT(*) n FROM workout_log WHERE user_id = ? AND date >= ? AND date <= ?'
    ).get(u.id, start, end).n;
    const weekBonus = g.completeDates.filter(d => d >= start && d <= end).length * XP_DAY_BONUS;
    const profile = db.prepare('SELECT avatar FROM profile WHERE user_id = ?').get(u.id);
    return {
      username: u.username,
      level: g.level,
      xp: g.xp,
      weekXp: weekLogs * XP_PER_EXERCISE + weekBonus,
      avatar: (profile && profile.avatar) || '',
      isMe: u.id === req.session.userId,
    };
  }).sort((a, b) => b.weekXp - a.weekXp || b.xp - a.xp);

  res.json(rows);
});

// ======== FOTOS DE PROGRESSO ========

app.get('/api/photos', (req, res) => {
  const rows = db.prepare(
    'SELECT id, date, label, image FROM progress_photos WHERE user_id = ? ORDER BY date ASC, id ASC'
  ).all(req.session.userId);
  res.json(rows);
});

app.post('/api/photos', (req, res) => {
  const { date, label, image } = req.body;
  if (!image || !String(image).startsWith('data:image/')) {
    return res.status(400).json({ error: 'Imagem inválida' });
  }
  if (String(image).length > 1.6 * 1024 * 1024) {
    return res.status(400).json({ error: 'Imagem muito grande' });
  }
  const d = date || new Date().toLocaleDateString('en-CA');
  const result = db.prepare(
    'INSERT INTO progress_photos (user_id, date, label, image) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, d, String(label || ''), image);
  res.status(201).json(db.prepare('SELECT id, date, label, image FROM progress_photos WHERE id = ?').get(result.lastInsertRowid));
});

app.delete('/api/photos/:id', (req, res) => {
  const result = db.prepare('DELETE FROM progress_photos WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Foto não encontrada' });
  res.json({ success: true });
});

// ======== CONQUISTAS, RECORDES E RETROSPECTIVA ========

function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString('en-CA');
}

// Recorde (maior carga) de cada exercício com a data em que saiu
function prsFor(uid) {
  return db.prepare(`
    SELECT pc.exercise, pc.weight, MIN(pc.date) AS date
    FROM progressao_carga pc
    JOIN (
      SELECT exercise, MAX(weight) AS mw FROM progressao_carga WHERE user_id = ? GROUP BY exercise
    ) m ON m.exercise = pc.exercise AND m.mw = pc.weight
    WHERE pc.user_id = ?
    GROUP BY pc.exercise
    ORDER BY pc.weight DESC
  `).all(uid, uid);
}

app.get('/api/prs', (req, res) => {
  res.json(prsFor(req.session.userId));
});

function buildAchievements(uid) {
  const g = computeGami(uid);
  const logCount = db.prepare('SELECT COUNT(*) n FROM workout_log WHERE user_id = ?').get(uid).n;
  const maxW = db.prepare('SELECT COALESCE(MAX(weight), 0) w FROM progressao_carga WHERE user_id = ?').get(uid).w;
  const volume = db.prepare(
    'SELECT COALESCE(SUM(weight * reps), 0) v FROM progressao_carga WHERE user_id = ? AND set_number >= 1'
  ).get(uid).v;
  const fotos = db.prepare('SELECT COUNT(*) n FROM progress_photos WHERE user_id = ?').get(uid).n;
  const meds = db.prepare('SELECT COUNT(*) n FROM measurements WHERE user_id = ?').get(uid).n;

  // Melhor sequência de água (dias batendo a meta)
  const wcfg = getWaterConfig(uid);
  const goalBottles = wcfg.daily_goal_ml / wcfg.bottle_size_ml;
  const metDates = db.prepare('SELECT date FROM water_intake WHERE user_id = ? AND bottles >= ? ORDER BY date ASC')
    .all(uid, goalBottles).map(r => r.date);
  let waterBest = 0;
  let ws = 0;
  for (let i = 0; i < metDates.length; i++) {
    if (i > 0 && (new Date(metDates[i]) - new Date(metDates[i - 1])) === 86400000) ws++;
    else ws = 1;
    if (ws > waterBest) waterBest = ws;
  }

  // Semana perfeita: alguma semana com dia completo em todos os dias planejados
  const plannedWds = db.prepare('SELECT DISTINCT weekday FROM plan_items WHERE user_id = ?').all(uid).map(r => r.weekday);
  const byWeek = {};
  g.completeDates.forEach(d => {
    const wk = mondayOf(d);
    (byWeek[wk] = byWeek[wk] || new Set()).add(weekdayOf(d));
  });
  const perfectWeek = plannedWds.length > 0 &&
    Object.values(byWeek).some(s => plannedWds.every(w => s.has(w)));

  const A = (id, icon, title, desc, unlocked, progress) =>
    ({ id, icon, title, desc, unlocked: !!unlocked, ...(progress || {}) });

  return [
    A('first', '🏁', 'Primeiro passo', 'Conclua seu primeiro exercício', logCount >= 1),
    A('week', '✅', 'Semana perfeita', 'Complete todos os dias do plano em uma semana', perfectWeek),
    A('day10', '🔥', 'Dez dias', '10 dias de treino completos', g.completeDays >= 10, { value: Math.min(g.completeDays, 10), target: 10 }),
    A('day50', '💪', 'Cinquentão', '50 dias de treino completos', g.completeDays >= 50, { value: Math.min(g.completeDays, 50), target: 50 }),
    A('day100', '🏛️', 'Centurião', '100 dias de treino completos', g.completeDays >= 100, { value: Math.min(g.completeDays, 100), target: 100 }),
    A('lvl5', '⭐', 'Nível 5', 'Alcance o nível 5 (Dedicado)', g.level >= 5, { value: Math.min(g.level, 5), target: 5 }),
    A('lvl10', '🌟', 'Nível 10', 'Alcance o nível 10 (Monstro)', g.level >= 10, { value: Math.min(g.level, 10), target: 10 }),
    A('kg100', '🐘', 'Clube dos 100', 'Registre 100 kg ou mais em um exercício', maxW >= 100, { value: Math.min(Math.round(maxW), 100), target: 100 }),
    A('vol10', '🚛', '10 toneladas', 'Mova 10.000 kg somando todas as séries', volume >= 10000, { value: Math.min(Math.round(volume), 10000), target: 10000 }),
    A('agua7', '💧', 'Hidratado', '7 dias seguidos batendo a meta de água', waterBest >= 7, { value: Math.min(waterBest, 7), target: 7 }),
    A('foto', '📸', 'Shape check', 'Registre sua primeira foto de progresso', fotos >= 1),
    A('med3', '📏', 'Sob medida', 'Registre 3 medições corporais', meds >= 3, { value: Math.min(meds, 3), target: 3 }),
  ];
}

app.get('/api/achievements', (req, res) => {
  res.json(buildAchievements(req.session.userId));
});

function followCounts(uid) {
  return {
    followers: db.prepare('SELECT COUNT(*) n FROM follows WHERE followed_id = ?').get(uid).n,
    following: db.prepare('SELECT COUNT(*) n FROM follows WHERE follower_id = ?').get(uid).n,
  };
}

// Perfil público: só informações de treino/gamificação, nada pessoal
app.get('/api/users/:username/public', (req, res) => {
  const u = db.prepare('SELECT id, username, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  const g = computeGami(u.id);
  const profile = db.prepare('SELECT avatar FROM profile WHERE user_id = ?').get(u.id);
  const counts = followCounts(u.id);
  const isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?')
    .get(req.session.userId, u.id);
  res.json({
    username: u.username,
    created_at: u.created_at,
    avatar: (profile && profile.avatar) || '',
    level: g.level,
    xp: g.xp,
    completeDays: g.completeDays,
    totalExercises: g.totalExercises,
    achievements: buildAchievements(u.id).filter(a => a.unlocked),
    prs: prsFor(u.id).slice(0, 8),
    followers: counts.followers,
    following: counts.following,
    isFollowing,
    isMe: u.id === req.session.userId,
  });
});

// Seguir / deixar de seguir (toggle)
app.post('/api/users/:username/follow', (req, res) => {
  const u = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  const me = req.session.userId;
  if (u.id === me) return res.status(400).json({ error: 'Você não pode seguir a si mesmo' });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?').get(me, u.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?').run(me, u.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES (?, ?)').run(me, u.id);
    const myName = db.prepare('SELECT username FROM users WHERE id = ?').get(me).username;
    notify(u.id, 'follow', `f:${myName}`, '🫡', `${myName} começou a seguir você`, 'Agora seus recordes têm plateia. Bora treinar!', me);
  }
  res.json({ isFollowing: !existing, ...followCounts(u.id) });
});

// Retrospectiva dos últimos 30 dias (estilo wrapped)
app.get('/api/wrapped', (req, res) => {
  const uid = req.session.userId;
  const DAYS = 30;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (DAYS - 1));
  const s = start.toLocaleDateString('en-CA');
  const e = end.toLocaleDateString('en-CA');

  const g = computeGami(uid);
  const logs = db.prepare('SELECT date FROM workout_log WHERE user_id = ? AND date >= ? AND date <= ?').all(uid, s, e);
  const treinos = new Set(logs.map(l => l.date)).size;
  const completeInPeriod = g.completeDates.filter(d => d >= s && d <= e).length;
  const xp = logs.length * XP_PER_EXERCISE + completeInPeriod * XP_DAY_BONUS;

  const volume = db.prepare(
    'SELECT COALESCE(SUM(weight * reps), 0) v FROM progressao_carga WHERE user_id = ? AND set_number >= 1 AND date >= ? AND date <= ?'
  ).get(uid, s, e).v;

  // Exercício que mais evoluiu no período (delta do top set diário)
  const prog = db.prepare(
    'SELECT exercise, date, MAX(weight) AS w FROM progressao_carga WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY exercise, date ORDER BY exercise, date'
  ).all(uid, s, e);
  const byEx = {};
  prog.forEach(r => { (byEx[r.exercise] = byEx[r.exercise] || []).push(r.w); });
  let topEx = null;
  for (const [name, ws] of Object.entries(byEx)) {
    if (ws.length < 2) continue;
    const delta = ws[ws.length - 1] - ws[0];
    if (!topEx || delta > topEx.delta) topEx = { name, delta };
  }

  const rec = db.prepare(
    'SELECT exercise, MAX(weight) AS weight FROM progressao_carga WHERE user_id = ? AND date >= ? AND date <= ?'
  ).get(uid, s, e);

  const wcfg = getWaterConfig(uid);
  const aguaMl = db.prepare(
    'SELECT COALESCE(SUM(bottles), 0) b FROM water_intake WHERE user_id = ? AND date >= ? AND date <= ?'
  ).get(uid, s, e).b * wcfg.bottle_size_ml;

  // Séries e reps do período (linhas por série)
  const sr = db.prepare(
    'SELECT COUNT(*) AS sets, COALESCE(SUM(reps), 0) AS reps FROM progressao_carga WHERE user_id = ? AND set_number >= 1 AND date >= ? AND date <= ?'
  ).get(uid, s, e);

  // Melhor sequência de dias seguidos e dia favorito no período
  const dates = [...new Set(logs.map(l => l.date))].sort();
  let bestStreak = 0;
  let st = 0;
  dates.forEach((d, i) => {
    st = i > 0 && (new Date(d) - new Date(dates[i - 1])) === 86400000 ? st + 1 : 1;
    if (st > bestStreak) bestStreak = st;
  });
  const wdCount = {};
  dates.forEach(d => {
    const w = weekdayOf(d);
    wdCount[w] = (wdCount[w] || 0) + 1;
  });
  let favDay = null;
  for (const [w, count] of Object.entries(wdCount)) {
    if (!favDay || count > favDay.count) favDay = { weekday: +w, count };
  }

  res.json({
    days: DAYS,
    treinos,
    exercicios: logs.length,
    xp,
    volumeKg: Math.round(volume),
    sets: sr.sets,
    reps: sr.reps,
    bestStreak,
    favDay,
    topEx,
    record: rec && rec.weight ? { exercise: rec.exercise, weight: rec.weight } : null,
    aguaL: +(aguaMl / 1000).toFixed(1),
    level: g.level,
    completeDays: completeInPeriod,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
