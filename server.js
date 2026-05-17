const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3010;

const AUTH_USER = process.env.AUTH_USER || 'admin';
const AUTH_PASS = process.env.AUTH_PASS || 'admin';
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

// Arquivos públicos (CSS para login)
app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));

// Rotas públicas (login)
app.get('/login.html', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER && password === AUTH_PASS) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Usuário ou senha incorretos' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
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

// Listar todas as medições ordenadas por data
app.get('/api/measurements', (req, res) => {
  const rows = db.prepare('SELECT * FROM measurements ORDER BY date ASC').all();
  res.json(rows);
});

// Adicionar nova medição
app.post('/api/measurements', (req, res) => {
  const { date, label, peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha } = req.body;

  const stmt = db.prepare(`
    INSERT INTO measurements (date, label, peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(date, label || '', peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha);
  const newRow = db.prepare('SELECT * FROM measurements WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newRow);
});

// Editar medição existente
app.put('/api/measurements/:id', (req, res) => {
  const { id } = req.params;
  const { date, label, peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha } = req.body;

  const stmt = db.prepare(`
    UPDATE measurements SET date = ?, label = ?, peso = ?, biceps_contraido = ?, biceps_relaxado = ?, antebraco = ?, ombro_bustos = ?, peito = ?, cintura_buxinho = ?, cintura_umbigo = ?, coxa_superior = ?, coxa_inferior = ?, panturrilha = ?
    WHERE id = ?
  `);

  stmt.run(date, label || '', peso, biceps_contraido, biceps_relaxado, antebraco, ombro_bustos, peito, cintura_buxinho, cintura_umbigo, coxa_superior, coxa_inferior, panturrilha, id);
  const updated = db.prepare('SELECT * FROM measurements WHERE id = ?').get(id);

  if (!updated) {
    return res.status(404).json({ error: 'Medição não encontrada' });
  }

  res.json(updated);
});

// Remover medição
app.delete('/api/measurements/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM measurements WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Medição não encontrada' });
  }

  res.json({ success: true });
});

// Perfil
app.get('/api/profile', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  res.json(profile || {});
});

app.put('/api/profile', (req, res) => {
  const { sexo, idade, altura, freq, calorias, rotina } = req.body;
  db.prepare(`
    UPDATE profile SET sexo = ?, idade = ?, altura = ?, freq = ?, calorias = ?, rotina = ?
    WHERE id = 1
  `).run(sexo || '', idade || null, altura || null, freq || null, calorias || null, rotina || '');
  const updated = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  res.json(updated);
});

// Water config
app.get('/api/water-config', (req, res) => {
  const config = db.prepare('SELECT * FROM water_config WHERE id = 1').get();
  res.json(config || {});
});

app.put('/api/water-config', (req, res) => {
  const { bottle_size_ml, daily_goal_ml } = req.body;
  db.prepare(`
    UPDATE water_config SET bottle_size_ml = ?, daily_goal_ml = ? WHERE id = 1
  `).run(bottle_size_ml || 500, daily_goal_ml || 3000);
  const updated = db.prepare('SELECT * FROM water_config WHERE id = 1').get();
  res.json(updated);
});

// Water intake stats (must be before parameterized routes)
app.get('/api/water-intake/stats', (req, res) => {
  const config = db.prepare('SELECT * FROM water_config WHERE id = 1').get();
  const goalBottles = config.daily_goal_ml / config.bottle_size_ml;

  const rows = db.prepare('SELECT date, bottles FROM water_intake ORDER BY date ASC').all();

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
    "SELECT * FROM water_intake WHERE date LIKE ? ORDER BY date ASC"
  ).all(`${year}-%`);
  res.json(rows);
});

// Water intake - upsert
app.post('/api/water-intake', (req, res) => {
  const { date, bottles } = req.body;
  db.prepare(`
    INSERT INTO water_intake (date, bottles) VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET bottles = ?
  `).run(date, bottles, bottles);
  const row = db.prepare('SELECT * FROM water_intake WHERE date = ?').get(date);
  res.json(row);
});

// Water intake - delete by date
app.delete('/api/water-intake/:date', (req, res) => {
  const { date } = req.params;
  const result = db.prepare('DELETE FROM water_intake WHERE date = ?').run(date);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }
  res.json({ success: true });
});

// ======== TREINO ========

// Treino stats
app.get('/api/treino/stats', (req, res) => {
  const rows = db.prepare('SELECT date, rating, musculacao, corrida FROM treino ORDER BY date ASC').all();
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
    "SELECT * FROM treino WHERE date LIKE ? ORDER BY date ASC"
  ).all(`${year}-%`);
  res.json(rows);
});

// Treino - upsert
app.post('/api/treino', (req, res) => {
  const { date, rating, notes, musculacao, corrida } = req.body;
  const m = musculacao ? 1 : 0;
  const c = corrida ? 1 : 0;
  // If neither activity, delete the record (treat as "no training")
  if (m === 0 && c === 0 && (rating == null || rating === 0)) {
    db.prepare('DELETE FROM treino WHERE date = ?').run(date);
    return res.json({ deleted: true, date });
  }
  const r = rating != null ? rating : (m ? 4 : 0);
  db.prepare(`
    INSERT INTO treino (date, rating, musculacao, corrida, notes) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET rating = ?, musculacao = ?, corrida = ?, notes = ?
  `).run(date, r, m, c, notes || '', r, m, c, notes || '');
  const row = db.prepare('SELECT * FROM treino WHERE date = ?').get(date);
  res.json(row);
});

// Treino - delete by date
app.delete('/api/treino/:date', (req, res) => {
  const { date } = req.params;
  const result = db.prepare('DELETE FROM treino WHERE date = ?').run(date);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }
  res.json({ success: true });
});

// ======== PROGRESSAO DE CARGA ========

app.get('/api/progressao', (req, res) => {
  const { exercise, year } = req.query;
  let sql = 'SELECT * FROM progressao_carga WHERE 1=1';
  const params = [];
  if (exercise) {
    sql += ' AND exercise = ?';
    params.push(exercise);
  }
  if (year) {
    sql += " AND date LIKE ?";
    params.push(`${year}-%`);
  }
  sql += ' ORDER BY date ASC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/progressao/exercises', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT exercise FROM progressao_carga ORDER BY exercise ASC').all();
  res.json(rows.map(r => r.exercise));
});

app.post('/api/progressao', (req, res) => {
  const { date, exercise, weight, sets, reps } = req.body;
  const result = db.prepare(
    'INSERT INTO progressao_carga (date, exercise, weight, sets, reps) VALUES (?, ?, ?, ?, ?)'
  ).run(date, exercise, weight || 0, sets || 0, reps || 0);
  const row = db.prepare('SELECT * FROM progressao_carga WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/progressao/:id', (req, res) => {
  const { id } = req.params;
  const { date, exercise, weight, sets, reps } = req.body;
  db.prepare(
    'UPDATE progressao_carga SET date = ?, exercise = ?, weight = ?, sets = ?, reps = ? WHERE id = ?'
  ).run(date, exercise, weight || 0, sets || 0, reps || 0, id);
  const updated = db.prepare('SELECT * FROM progressao_carga WHERE id = ?').get(id);
  if (!updated) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json(updated);
});

app.delete('/api/progressao/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM progressao_carga WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
