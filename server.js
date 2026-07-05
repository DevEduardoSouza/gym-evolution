const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, ensureUserRows } = require('./database');
const { hashPassword, verifyPassword } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3010;

const SESSION_SECRET = process.env.SESSION_SECRET || 'gym-evolution-secret-change-me';

app.use(express.json());
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

// Arquivos públicos (CSS para login, favicon)
app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));
app.use('/favicon.svg', express.static(path.join(__dirname, 'public', 'favicon.svg')));
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

app.use(express.static(path.join(__dirname, 'public')));

// Usuário logado
app.get('/api/me', (req, res) => {
  res.json({ username: req.session.username });
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
  const { sexo, idade, altura, freq, calorias, rotina, peso_meta } = req.body;
  db.prepare('INSERT OR IGNORE INTO profile (user_id) VALUES (?)').run(req.session.userId);
  db.prepare(`
    UPDATE profile SET sexo = ?, idade = ?, altura = ?, freq = ?, calorias = ?, rotina = ?, peso_meta = ?
    WHERE user_id = ?
  `).run(sexo || '', idade || null, altura || null, freq || null, calorias || null, rotina || '', peso_meta || null, req.session.userId);
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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
