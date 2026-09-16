// Integração com a FatSecret Platform API (OAuth 1.0 de três pernas, HMAC-SHA1).
// Sem dependências: só crypto + fetch nativos do Node 18+.
//
// Fluxo de vínculo (uma vez por usuário):
//   1. requestToken()  -> token temporário + URL de autorização
//   2. usuário aprova no site da FatSecret e recebe um PIN (oauth_verifier)
//   3. accessToken(token, secret, pin) -> access token permanente, salvo em fatsecret_link
//
// Depois disso getFoodEntries(date) lê o diário do dia e importMealsForDate() joga no meal_log.

const crypto = require('crypto');

const REQUEST_TOKEN_URL = 'https://authentication.fatsecret.com/oauth/request_token';
const AUTHORIZE_URL = 'https://authentication.fatsecret.com/oauth/authorize';
const ACCESS_TOKEN_URL = 'https://authentication.fatsecret.com/oauth/access_token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

function creds() {
  const key = process.env.FATSECRET_CONSUMER_KEY;
  const secret = process.env.FATSECRET_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('FATSECRET_CONSUMER_KEY / FATSECRET_CONSUMER_SECRET não configurados');
  return { key, secret };
}

// RFC 3986: encodeURIComponent deixa passar !'()* — o OAuth 1.0 exige codificá-los
function enc(v) {
  return encodeURIComponent(String(v)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function sign(method, url, params, consumerSecret, tokenSecret = '') {
  const base = [
    method.toUpperCase(),
    enc(url),
    enc(Object.keys(params).sort().map(k => `${enc(k)}=${enc(params[k])}`).join('&')),
  ].join('&');
  const key = `${enc(consumerSecret)}&${enc(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function oauthParams(token) {
  const { key } = creds();
  const p = {
    oauth_consumer_key: key,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_nonce: crypto.randomBytes(12).toString('hex'),
    oauth_version: '1.0',
  };
  if (token) p.oauth_token = token;
  return p;
}

async function signedRequest(method, url, extra, tokenSecret = '', token = null) {
  const params = { ...oauthParams(token), ...extra };
  params.oauth_signature = sign(method, url, params, creds().secret, tokenSecret);
  const body = Object.keys(params).map(k => `${enc(k)}=${enc(params[k])}`).join('&');
  const res = method === 'GET'
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`FatSecret ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

function parseForm(text) {
  return Object.fromEntries(new URLSearchParams(text));
}

// Passo 1: token temporário + link que o usuário abre para autorizar
async function requestToken() {
  const r = parseForm(await signedRequest('POST', REQUEST_TOKEN_URL, { oauth_callback: 'oob' }));
  if (!r.oauth_token) throw new Error('request_token sem oauth_token: ' + JSON.stringify(r));
  return {
    token: r.oauth_token,
    secret: r.oauth_token_secret,
    authorizeUrl: `${AUTHORIZE_URL}?oauth_token=${enc(r.oauth_token)}`,
  };
}

// Passo 3: troca o token temporário + PIN pelo token permanente
async function accessToken(token, secret, verifier) {
  const r = parseForm(await signedRequest('GET', ACCESS_TOKEN_URL, { oauth_verifier: String(verifier).trim() }, secret, token));
  if (!r.oauth_token) throw new Error('access_token sem oauth_token: ' + JSON.stringify(r));
  return { token: r.oauth_token, secret: r.oauth_token_secret };
}

// Dias desde 1970-01-01 (formato de data da FatSecret), a partir de 'YYYY-MM-DD'
function dateInt(isoDate) {
  return Math.floor(Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10)) / 86400000);
}

// Todas as entradas do diário de um dia
async function getFoodEntries(link, isoDate) {
  const text = await signedRequest('POST', API_URL, {
    method: 'food_entries.get.v2',
    date: dateInt(isoDate),
    format: 'json',
  }, link.secret, link.token);
  const json = JSON.parse(text);
  if (json.error) throw new Error(`FatSecret erro ${json.error.code}: ${json.error.message}`);
  let entries = json.food_entries && json.food_entries.food_entry;
  if (!entries) return [];
  if (!Array.isArray(entries)) entries = [entries];
  return entries.map(e => ({
    id: e.food_entry_id,
    name: e.food_entry_name || e.food_entry_description || '',
    meal: e.meal,
    kcal: +e.calories || 0,
    protein_g: +e.protein || 0,
    carb_g: +e.carbohydrate || 0,
    fat_g: +e.fat || 0,
  }));
}

// FatSecret usa breakfast/lunch/dinner/other; o app usa cafe/almoco/janta/lanche
const MEAL_MAP = { breakfast: 'cafe', lunch: 'almoco', dinner: 'janta', other: 'lanche' };
const MEAL_LABEL = { cafe: 'Café da manhã', almoco: 'Almoço', janta: 'Jantar', lanche: 'Lanches/Outros' };

// Soma as entradas por refeição e grava um lançamento rápido por refeição (mesmo padrão do formulário).
// Não duplica: se o dia já tem qualquer lançamento vindo do FatSecret, substitui só esses.
function importMealsForDate(db, userId, link, isoDate) {
  return getFoodEntries(link, isoDate).then(entries => {
    const byMeal = {};
    for (const e of entries) {
      const meal = MEAL_MAP[String(e.meal).toLowerCase()] || 'lanche';
      const m = byMeal[meal] || (byMeal[meal] = { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, items: 0 });
      m.kcal += e.kcal; m.protein_g += e.protein_g; m.carb_g += e.carb_g; m.fat_g += e.fat_g; m.items++;
    }
    const meals = Object.keys(byMeal);
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM meal_log WHERE user_id = ? AND date = ? AND source = 'fatsecret'").run(userId, isoDate);
      const ins = db.prepare(`
        INSERT INTO meal_log (user_id, date, meal, food_id, grams, label, kcal, protein_g, carb_g, fat_g, source)
        VALUES (?, ?, ?, 0, 100, ?, ?, ?, ?, ?, 'fatsecret')
      `);
      for (const meal of meals) {
        const m = byMeal[meal];
        ins.run(userId, isoDate, meal, `${MEAL_LABEL[meal]} (FatSecret)`,
          Math.round(m.kcal), +m.protein_g.toFixed(2), +m.carb_g.toFixed(2), +m.fat_g.toFixed(2));
      }
    });
    tx();
    const kcal = Math.round(meals.reduce((s, m) => s + byMeal[m].kcal, 0));
    return { date: isoDate, meals: meals.length, items: entries.length, kcal };
  });
}

module.exports = { requestToken, accessToken, getFoodEntries, importMealsForDate, dateInt };

// Uso direto no terminal para o vínculo inicial:
//   node fatsecret.js request            -> imprime token/secret e a URL de autorização
//   node fatsecret.js access TOKEN SECRET PIN
//   node fatsecret.js entries TOKEN SECRET 2026-09-15
if (require.main === module) {
  (function loadDotEnv() {
    try {
      require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      });
    } catch {}
  })();
  const [cmd, a, b, c] = process.argv.slice(2);
  const run = {
    request: () => requestToken(),
    access: () => accessToken(a, b, c),
    entries: () => getFoodEntries({ token: a, secret: b }, c),
  }[cmd];
  if (!run) { console.error('uso: node fatsecret.js request | access TOKEN SECRET PIN | entries TOKEN SECRET YYYY-MM-DD'); process.exit(1); }
  run().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e.message); process.exit(1); });
}
