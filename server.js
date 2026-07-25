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

app.use(session({
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
  res.json({ username: req.session.username, created_at: user ? user.created_at : null });
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
  db.prepare('INSERT INTO workout_log (user_id, date, plan_item_id) VALUES (?, ?, ?)')
    .run(req.session.userId, date, plan_item_id);
  res.json({ done: true });
});

// Gamificação: XP, nível e estatísticas
const XP_PER_EXERCISE = 10;
const XP_DAY_BONUS = 30;

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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
