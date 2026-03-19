const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
