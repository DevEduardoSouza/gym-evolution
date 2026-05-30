const FIELDS = [
  { key: 'peso', label: 'Peso (kg)', unit: 'kg', type: 'muscle' },
  { key: 'biceps_contraido', label: 'Bíceps Contraído', unit: 'cm', type: 'muscle' },
  { key: 'biceps_relaxado', label: 'Bíceps Relaxado', unit: 'cm', type: 'muscle' },
  { key: 'antebraco', label: 'Antebraço', unit: 'cm', type: 'muscle' },
  { key: 'ombro_bustos', label: 'Ombro / Bustos', unit: 'cm', type: 'muscle' },
  { key: 'peito', label: 'Peito', unit: 'cm', type: 'muscle' },
  { key: 'cintura_buxinho', label: 'Cintura (Buxinho)', unit: 'cm', type: 'waist' },
  { key: 'cintura_umbigo', label: 'Cintura (Umbigo)', unit: 'cm', type: 'waist' },
  { key: 'coxa_superior', label: 'Coxa Superior', unit: 'cm', type: 'muscle' },
  { key: 'coxa_inferior', label: 'Coxa Inferior', unit: 'cm', type: 'muscle' },
  { key: 'panturrilha', label: 'Panturrilha', unit: 'cm', type: 'muscle' },
];

const BODY_LABELS = [
  { key: 'ombro_bustos',     label: 'Ombro/Bustos',  side: 'left',  y: 155, tx: 245, ty: 155, type: 'muscle' },
  { key: 'peito',            label: 'Peito',         side: 'left',  y: 190, tx: 282, ty: 190, type: 'muscle' },
  { key: 'biceps_contraido', label: 'Bíceps Contr.', side: 'left',  y: 225, tx: 235, ty: 225, type: 'muscle' },
  { key: 'biceps_relaxado',  label: 'Bíceps Relax.', side: 'left',  y: 260, tx: 240, ty: 260, type: 'muscle' },
  { key: 'antebraco',        label: 'Antebraço',     side: 'left',  y: 305, tx: 215, ty: 305, type: 'muscle' },
  { key: 'coxa_inferior',    label: 'Coxa Inferior', side: 'left',  y: 480, tx: 266, ty: 480, type: 'muscle' },
  { key: 'cintura_buxinho',  label: 'Cintura (Bux.)', side: 'right', y: 215, tx: 343, ty: 215, type: 'waist' },
  { key: 'cintura_umbigo',   label: 'Cintura (Umb.)', side: 'right', y: 260, tx: 361, ty: 260, type: 'waist' },
  { key: 'coxa_superior',    label: 'Coxa Sup.',      side: 'right', y: 380, tx: 373, ty: 380, type: 'muscle' },
  { key: 'panturrilha',      label: 'Panturrilha',    side: 'right', y: 555, tx: 397, ty: 555, type: 'muscle' },
];


const BODY_SVG_BASE = `
  <g class="body" transform="translate(170, 20) scale(3)">
    <polygon class="body-part" points="42.4489796 2.85714286 40 11.8367347 42.0408163 19.5918367 46.122449 23.2653061 49.7959184 25.3061224 54.6938776 22.4489796 57.5510204 19.1836735 59.1836735 10.2040816 57.1428571 2.44897959 49.7959184 0"/>
    <polygon class="body-part" points="55.5102041 23.6734694 50.6122449 33.4693878 50.6122449 39.1836735 61.6326531 40 70.6122449 44.8979592 69.3877551 36.7346939 63.2653061 35.1020408 58.3673469 30.6122449"/>
    <polygon class="body-part" points="28.9795918 44.8979592 30.2040816 37.1428571 36.3265306 35.1020408 41.2244898 30.2040816 44.4897959 24.4897959 48.9795918 33.877551 48.5714286 39.1836735 37.9591837 39.5918367"/>
    <polygon class="muscle" data-key="ombro_bustos" points="78.3673469 53.0612245 79.5918367 47.755102 79.1836735 41.2244898 75.9183673 37.9591837 71.0204082 36.3265306 72.244898 42.8571429 71.4285714 47.3469388"/>
    <polygon class="muscle" data-key="ombro_bustos" points="28.1632653 47.3469388 21.2244898 53.0612245 20 47.755102 20.4081633 40.8163265 24.4897959 37.1428571 28.5714286 37.1428571 26.9387755 43.2653061"/>
    <polygon class="muscle" data-key="peito" points="51.8367347 41.6326531 51.0204082 55.1020408 57.9591837 57.9591837 67.755102 55.5102041 70.6122449 47.3469388 62.0408163 41.6326531"/>
    <polygon class="muscle" data-key="peito" points="29.7959184 46.5306122 31.4285714 55.5102041 40.8163265 57.9591837 48.1632653 55.1020408 47.755102 42.0408163 37.5510204 42.0408163"/>
    <polygon class="muscle" data-key="biceps_contraido" points="16.7346939 68.1632653 17.9591837 71.4285714 22.8571429 66.122449 28.9795918 53.877551 27.755102 49.3877551 20.4081633 55.9183673"/>
    <polygon class="muscle" data-key="biceps_contraido" points="71.4285714 49.3877551 70.2040816 54.6938776 76.3265306 66.122449 81.6326531 71.8367347 82.8571429 68.9795918 78.7755102 55.5102041"/>
    <polygon class="body-part" points="69.3877551 55.5102041 69.3877551 61.6326531 75.9183673 72.6530612 77.5510204 70.2040816 75.5102041 67.3469388"/>
    <polygon class="body-part" points="22.4489796 69.3877551 29.7959184 55.5102041 29.7959184 60.8163265 22.8571429 73.0612245"/>
    <polygon class="muscle" data-key="cintura_buxinho" points="56.3265306 59.1836735 57.9591837 64.0816327 58.3673469 77.9591837 58.3673469 92.6530612 56.3265306 98.3673469 55.1020408 104.081633 51.4285714 107.755102 51.0204082 84.4897959 50.6122449 67.3469388 51.0204082 57.1428571"/>
    <polygon class="muscle" data-key="cintura_buxinho" points="43.6734694 58.7755102 48.5714286 57.1428571 48.9795918 67.3469388 48.5714286 84.4897959 48.1632653 107.346939 44.4897959 103.673469 40.8163265 91.4285714 40.8163265 78.3673469 41.2244898 64.4897959"/>
    <polygon class="muscle" data-key="cintura_umbigo" points="68.5714286 63.2653061 67.3469388 57.1428571 58.7755102 59.5918367 60 64.0816327 60.4081633 83.2653061 65.7142857 78.7755102 66.5306122 69.7959184"/>
    <polygon class="muscle" data-key="cintura_umbigo" points="33.877551 78.3673469 33.0612245 71.8367347 31.0204082 63.2653061 32.244898 57.1428571 40.8163265 59.1836735 39.1836735 63.2653061 39.1836735 83.6734694"/>
    <polygon class="muscle" data-key="antebraco" points="6.12244898 88.5714286 10.2040816 75.1020408 14.6938776 70.2040816 16.3265306 74.2857143 19.1836735 73.4693878 4.48979592 97.5510204 0 100"/>
    <polygon class="muscle" data-key="antebraco" points="84.4897959 69.7959184 83.2653061 73.4693878 80 73.0612245 95.1020408 98.3673469 100 100.408163 93.4693878 89.3877551 89.7959184 76.3265306"/>
    <polygon class="muscle" data-key="antebraco" points="77.5510204 72.244898 77.5510204 77.5510204 80.4081633 84.0816327 85.3061224 89.7959184 92.244898 101.22449 94.6938776 99.5918367"/>
    <polygon class="muscle" data-key="antebraco" points="6.93877551 101.22449 13.4693878 90.6122449 18.7755102 84.0816327 21.6326531 77.1428571 21.2244898 71.8367347 4.89795918 98.7755102"/>
    <polygon class="body-part" points="52.6530612 110.204082 54.2857143 124.897959 60 110.204082 62.0408163 100 64.8979592 94.2857143 60 92.6530612 56.7346939 104.489796"/>
    <polygon class="body-part" points="47.755102 110.612245 44.8979592 125.306122 42.0408163 115.918367 40.4081633 113.061224 39.5918367 107.346939 37.9591837 102.44898 34.6938776 93.877551 39.5918367 92.244898 41.6326531 99.1836735 43.6734694 105.306122"/>
    <polygon class="muscle" data-key="coxa_superior" points="34.6938776 98.7755102 37.1428571 108.163265 37.1428571 127.755102 34.2857143 137.142857 31.0204082 132.653061 29.3877551 120 28.1632653 111.428571 29.3877551 100.816327 32.244898 94.6938776"/>
    <polygon class="muscle" data-key="coxa_superior" points="63.2653061 105.714286 64.4897959 100 66.9387755 94.6938776 70.2040816 101.22449 71.0204082 111.836735 68.1632653 133.061224 65.3061224 137.55102 62.4489796 128.571429 62.0408163 111.428571"/>
    <polygon class="muscle" data-key="coxa_superior" points="38.7755102 129.387755 38.3673469 112.244898 41.2244898 118.367347 44.4897959 129.387755 42.8571429 135.102041 40 146.122449 36.3265306 146.530612 35.5102041 140"/>
    <polygon class="muscle" data-key="coxa_superior" points="59.5918367 145.714286 55.5102041 128.979592 60.8163265 113.877551 61.2244898 130.204082 64.0816327 139.591837 62.8571429 146.530612"/>
    <polygon class="muscle" data-key="coxa_superior" points="32.6530612 138.367347 26.5306122 145.714286 25.7142857 136.734694 25.7142857 127.346939 26.9387755 114.285714 29.3877551 133.469388"/>
    <polygon class="muscle" data-key="coxa_superior" points="71.8367347 113.061224 73.877551 124.081633 73.877551 140.408163 72.6530612 145.714286 66.5306122 138.367347 70.2040816 133.469388"/>
    <polygon class="muscle" data-key="coxa_inferior" points="33.877551 140 34.6938776 143.265306 35.5102041 147.346939 36.3265306 151.020408 35.1020408 156.734694 29.7959184 156.734694 27.3469388 152.653061 27.3469388 147.346939 30.2040816 144.081633"/>
    <polygon class="muscle" data-key="coxa_inferior" points="65.7142857 140 72.244898 147.755102 72.244898 152.244898 69.7959184 157.142857 64.8979592 156.734694 62.8571429 151.020408"/>
    <polygon class="muscle" data-key="panturrilha" points="71.4285714 160.408163 73.4693878 153.469388 76.7346939 161.22449 79.5918367 167.755102 78.3673469 187.755102 79.5918367 195.510204 74.6938776 195.510204"/>
    <polygon class="muscle" data-key="panturrilha" points="24.8979592 194.693878 27.755102 164.897959 28.1632653 160.408163 26.122449 154.285714 24.8979592 157.55102 22.4489796 161.632653 20.8163265 167.755102 22.0408163 188.163265 20.8163265 195.510204"/>
    <polygon class="muscle" data-key="panturrilha" points="72.6530612 195.102041 69.7959184 159.183673 65.3061224 158.367347 64.0816327 162.44898 64.0816327 165.306122 65.7142857 177.142857"/>
    <polygon class="muscle" data-key="panturrilha" points="35.5102041 158.367347 35.9183673 162.44898 35.9183673 166.938776 35.1020408 172.244898 35.1020408 176.734694 32.244898 182.040816 30.6122449 187.346939 26.9387755 194.693878 27.3469388 187.755102 28.1632653 180.408163 28.5714286 175.510204 28.9795918 169.795918 29.7959184 164.081633 30.2040816 158.77551"/>
  </g>
`;

let bodyVisible = true;

let measurements = [];

// DOM elements
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');
const emptyMsg = document.getElementById('empty-msg');
const periodEl = document.getElementById('period');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('measurement-form');
const btnNew = document.getElementById('btn-new');
const btnCancel = document.getElementById('btn-cancel');

// API helpers
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

async function loadData() {
  measurements = await api('GET', '/api/measurements');
  render();
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Evolution period selection (click on columns)
let evoFromId = null;
let evoToId = null;

function buildEvolutionCell(field, fromM, toM) {
  const fromVal = fromM[field.key];
  const toVal = toM[field.key];
  if (fromVal != null && toVal != null) {
    const diff = toVal - fromVal;
    const sign = diff > 0 ? '+' : '';
    let cls = 'neutral';
    let arrow = '→';
    if (field.type === 'waist') {
      if (diff < 0) { cls = 'positive'; arrow = '↓'; }
      else if (diff > 0) { cls = 'warning'; arrow = '↑'; }
    } else {
      if (diff > 0) { cls = 'positive'; arrow = '↑'; }
      else if (diff < 0) { cls = 'negative'; arrow = '↓'; }
    }
    return `<td class="evolution"><span class="evo-pill ${cls}"><span class="evo-arrow">${arrow}</span>${sign}${diff.toFixed(1)}</span></td>`;
  }
  return '<td class="evolution"><span class="evo-pill neutral">—</span></td>';
}

function buildSparkline(field) {
  const values = measurements.map(m => m[field.key]);
  const valid = values.filter(v => v != null);
  if (valid.length < 2) return '<span class="spark-empty">—</span>';

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const w = 70, h = 22, pad = 2;

  let pts = '';
  let lastX = 0, lastY = 0;
  measurements.forEach((m, i) => {
    const v = m[field.key];
    if (v == null) return;
    const x = (measurements.length === 1 ? w / 2 : (i / (measurements.length - 1)) * (w - pad * 2) + pad);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    pts += `${x.toFixed(1)},${y.toFixed(1)} `;
    lastX = x; lastY = y;
  });

  const first = valid[0], last = valid[valid.length - 1];
  const trend = last - first;
  let color = '#888';
  if (field.type === 'waist') {
    if (trend < 0) color = '#66bb6a';
    else if (trend > 0) color = '#ffa726';
  } else {
    if (trend > 0) color = '#66bb6a';
    else if (trend < 0) color = '#ef5350';
  }

  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts.trim()}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.2" fill="${color}"/>
  </svg>`;
}

window.selectEvoColumn = function(id) {
  if (id === evoFromId) {
    // Deselect from
    evoFromId = evoToId;
    evoToId = null;
  } else if (id === evoToId) {
    // Deselect to
    evoToId = null;
  } else if (evoFromId === null || (evoFromId !== null && evoToId !== null)) {
    // Start fresh selection
    evoFromId = id;
    evoToId = null;
  } else {
    // Second click — set the "to"
    evoToId = id;
    // Ensure from is before to in the measurements array
    const fromIdx = measurements.findIndex(m => m.id === evoFromId);
    const toIdx = measurements.findIndex(m => m.id === evoToId);
    if (fromIdx > toIdx) {
      [evoFromId, evoToId] = [evoToId, evoFromId];
    }
  }
  render();
};

window.clearEvoSelection = function() {
  evoFromId = null;
  evoToId = null;
  render();
};

function buildLabelTexts(L, val, prev) {
  const isLeft = L.side === 'left';
  const labelX = isLeft ? 130 : 490;
  const nameAnchor = isLeft ? 'end' : 'start';

  const valueText = val != null ? `${val}` : '—';
  const valueCls = val != null ? '' : 'muted';

  let deltaText = '';
  let deltaCls = '';
  if (prev != null && val != null) {
    const diff = val - prev;
    const sign = diff > 0 ? '+' : '';
    deltaText = `${sign}${diff.toFixed(1)}`;
    if (Math.abs(diff) < 0.05) deltaCls = 'muted';
    else if (L.type === 'waist') deltaCls = diff < 0 ? 'positive' : 'warning';
    else deltaCls = diff > 0 ? 'positive' : 'negative';
  }

  let texts = `<text x="${labelX}" y="${L.y - 6}" text-anchor="${nameAnchor}" class="body-label-name">${L.label}</text>`;

  if (deltaText) {
    if (isLeft) {
      texts += `<text x="${labelX}" y="${L.y + 11}" text-anchor="end">` +
        `<tspan class="body-label-value ${valueCls}">${valueText}</tspan>` +
        `<tspan class="body-label-delta ${deltaCls}" dx="6">${deltaText}</tspan>` +
        `</text>`;
    } else {
      texts += `<text x="${labelX}" y="${L.y + 11}" text-anchor="start">` +
        `<tspan class="body-label-value ${valueCls}">${valueText}</tspan>` +
        `<tspan class="body-label-delta ${deltaCls}" dx="6">${deltaText}</tspan>` +
        `</text>`;
    }
  } else {
    texts += `<text x="${labelX}" y="${L.y + 11}" text-anchor="${nameAnchor}" class="body-label-value ${valueCls}">${valueText}</text>`;
  }

  return texts;
}

function muscleStateClass(val, prev, type) {
  if (val == null) return '';
  if (prev == null) return 'has-value';
  const diff = val - prev;
  if (Math.abs(diff) < 0.05) return 'has-value';
  if (type === 'waist') return diff < 0 ? 'has-value positive' : 'has-value warning';
  return diff > 0 ? 'has-value positive' : 'has-value negative';
}

function buildBodySVG(current, compare) {
  let extras = '';
  for (const L of BODY_LABELS) {
    const val = current ? current[L.key] : null;
    const prev = compare ? compare[L.key] : null;
    const isLeft = L.side === 'left';
    const lineStartX = isLeft ? 134 : 486;
    const lineEndX = L.tx + (isLeft ? -5 : 5);

    extras += `<g class="body-label-group" data-key="${L.key}">`;
    extras += `<path class="body-connector" d="M ${lineStartX} ${L.y + 4} L ${lineEndX} ${L.ty}"/>`;
    extras += `<circle class="body-connector-dot" cx="${L.tx}" cy="${L.ty}" r="3"/>`;
    extras += buildLabelTexts(L, val, prev);
    extras += `</g>`;
  }
  return `<svg viewBox="0 0 640 660" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Boneco com medidas corporais">${BODY_SVG_BASE}${extras}</svg>`;
}

function applyMuscleStates(container, current, compare) {
  const types = {};
  FIELDS.forEach(f => { types[f.key] = f.type; });
  const muscles = container.querySelectorAll('.muscle[data-key]');
  muscles.forEach(m => {
    const key = m.getAttribute('data-key');
    const val = current ? current[key] : null;
    const prev = compare ? compare[key] : null;
    m.classList.remove('has-value', 'positive', 'negative', 'warning');
    const cls = muscleStateClass(val, prev, types[key]);
    if (cls) cls.split(' ').forEach(c => m.classList.add(c));
  });
}

function renderBodyDiagram() {
  const card = document.getElementById('body-card');
  const container = document.getElementById('body-diagram');
  const titleEl = document.getElementById('body-card-title');
  const subEl = document.getElementById('body-card-sub');
  const weightEl = document.getElementById('body-card-weight');
  if (!card || !container) return;

  if (measurements.length === 0) {
    container.innerHTML = '<p class="body-empty">Adicione uma medição para visualizar o boneco.</p>';
    titleEl.textContent = 'Visualização Corporal';
    subEl.textContent = '';
    weightEl.textContent = '';
    weightEl.className = 'body-weight-pill';
    renderBodyGoal();
    return;
  }

  const evoFromM = evoFromId ? measurements.find(m => m.id === evoFromId) : null;
  const evoToM = evoToId ? measurements.find(m => m.id === evoToId) : null;
  const hasEvo = evoFromM && evoToM;

  const current = hasEvo ? evoToM : measurements[measurements.length - 1];
  const compare = hasEvo ? evoFromM : null;

  if (hasEvo) {
    titleEl.textContent = 'Comparação de Evolução';
    subEl.textContent = `${formatDate(evoFromM.date)} → ${formatDate(evoToM.date)}`;
  } else {
    titleEl.textContent = 'Última Medição';
    subEl.textContent = `${formatDate(current.date)}${current.label ? ' — ' + current.label : ''}`;
  }

  weightEl.className = 'body-weight-pill';
  if (current.peso != null) {
    let html = `${current.peso} kg`;
    if (compare && compare.peso != null) {
      const diff = current.peso - compare.peso;
      const sign = diff > 0 ? '+' : '';
      const pesoCls = Math.abs(diff) < 0.05 ? '' : diff > 0 ? 'warning' : 'positive';
      if (pesoCls) weightEl.classList.add(pesoCls);
      html += ` <span class="delta">(${sign}${diff.toFixed(1)})</span>`;
    }
    weightEl.innerHTML = html;
  } else {
    weightEl.textContent = '';
  }

  container.innerHTML = buildBodySVG(current, compare);
  applyMuscleStates(container, current, compare);
  attachBodyInteractions(container, current, compare);

  renderBodyGoal();
}

function fmtKg(n) {
  return `${(+n).toFixed(1).replace(/\.0$/, '').replace('.', ',')} kg`;
}

// Meta de peso: progresso do início (primeira medição) até a meta definida no perfil
function renderBodyGoal() {
  const goalEl = document.getElementById('body-goal');
  if (!goalEl) return;

  const meta = profileData && profileData.peso_meta != null ? Number(profileData.peso_meta) : null;
  const withPeso = measurements.filter(m => m.peso != null);
  if (!meta || withPeso.length === 0) {
    goalEl.style.display = 'none';
    return;
  }

  const startW = withPeso[0].peso;
  const currentW = withPeso[withPeso.length - 1].peso;
  const statusEl = document.getElementById('body-goal-status');
  const fillEl = document.getElementById('body-goal-fill');
  const startEl = document.getElementById('body-goal-start');
  const targetEl = document.getElementById('body-goal-target');

  goalEl.style.display = '';
  goalEl.classList.remove('reached', 'gain', 'loss');

  const losing = meta <= startW; // direção da meta (perder ou ganhar peso)
  const reached = losing ? currentW <= meta : currentW >= meta;

  let pct;
  if (Math.abs(startW - meta) < 0.05) {
    pct = 100;
  } else if (losing) {
    pct = ((startW - currentW) / (startW - meta)) * 100;
  } else {
    pct = ((currentW - startW) / (meta - startW)) * 100;
  }
  pct = Math.max(0, Math.min(100, pct));

  if (reached) {
    goalEl.classList.add('reached');
    pct = 100;
    statusEl.innerHTML = 'Meta atingida! 🎉';
  } else {
    goalEl.classList.add(losing ? 'loss' : 'gain');
    const falta = Math.abs(currentW - meta).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    statusEl.textContent = `faltam ${falta} kg`;
  }

  fillEl.style.width = pct.toFixed(0) + '%';
  startEl.textContent = `Início ${fmtKg(startW)}`;
  targetEl.textContent = `Meta ${fmtKg(meta)}`;
}

function attachBodyInteractions(container, current, compare) {
  const tooltip = document.getElementById('body-tooltip');
  if (!tooltip) return;

  const types = {};
  const labelNames = {};
  BODY_LABELS.forEach(L => { types[L.key] = L.type; labelNames[L.key] = L.label; });
  FIELDS.forEach(f => { if (!types[f.key]) types[f.key] = f.type; });

  function setHoverKey(key, on) {
    container
      .querySelectorAll(`.muscle[data-key="${key}"], .body-label-group[data-key="${key}"]`)
      .forEach(el => el.classList.toggle('is-hover', on));
  }

  function showTooltip(key, evt) {
    const val = current ? current[key] : null;
    const prev = compare ? compare[key] : null;
    const fld = FIELDS.find(f => f.key === key);
    const unit = fld ? fld.unit : '';
    const name = (fld && fld.label) || labelNames[key] || key;

    let html = `<div class="tt-name">${name}</div>`;
    if (val != null) {
      html += `<div class="tt-value">${val}${unit ? ' ' + unit : ''}</div>`;
      if (prev != null) {
        const diff = val - prev;
        const sign = diff > 0 ? '+' : '';
        let cls = 'muted';
        if (Math.abs(diff) >= 0.05) {
          cls = types[key] === 'waist'
            ? (diff < 0 ? 'positive' : 'warning')
            : (diff > 0 ? 'positive' : 'negative');
        }
        html += `<div class="tt-delta ${cls}">${sign}${diff.toFixed(1)}${unit ? ' ' + unit : ''}</div>`;
      }
    } else {
      html += `<div class="tt-value muted">— sem medida</div>`;
    }
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    positionTooltip(evt);
  }

  function positionTooltip(evt) {
    const pad = 14;
    const x = evt.clientX + pad;
    const y = evt.clientY - 12;
    const rect = tooltip.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    tooltip.style.left = Math.min(x, maxX) + 'px';
    tooltip.style.top = Math.max(8, y) + 'px';
  }

  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  const targets = container.querySelectorAll('.muscle[data-key], .body-label-group[data-key]');
  targets.forEach(el => {
    const key = el.getAttribute('data-key');
    el.addEventListener('mouseenter', e => { setHoverKey(key, true); showTooltip(key, e); });
    el.addEventListener('mousemove', positionTooltip);
    el.addEventListener('mouseleave', () => { setHoverKey(key, false); hideTooltip(); });
  });
}

function render() {
  renderBodyDiagram();
  const hasMeasurements = measurements.length > 0;
  document.querySelector('table').style.display = hasMeasurements ? '' : 'none';
  emptyMsg.style.display = hasMeasurements ? 'none' : '';

  if (!hasMeasurements) {
    periodEl.textContent = '';
    return;
  }

  // Period
  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  periodEl.textContent = `${formatDate(first.date)} - ${formatDate(last.date)}`;

  const showEvolution = measurements.length >= 2;

  // Validate evo selection still exists
  if (evoFromId && !measurements.find(m => m.id === evoFromId)) evoFromId = null;
  if (evoToId && !measurements.find(m => m.id === evoToId)) evoToId = null;

  const evoFromM = evoFromId ? measurements.find(m => m.id === evoFromId) : null;
  const evoToM = evoToId ? measurements.find(m => m.id === evoToId) : null;
  const hasCustomEvo = evoFromM && evoToM;

  // Build header
  let headHtml = '<tr><th>Medida</th><th class="col-spark">Tendência</th>';
  measurements.forEach(m => {
    const isEvoFrom = m.id === evoFromId;
    const isEvoTo = m.id === evoToId;
    const isSelected = isEvoFrom || isEvoTo;
    const selClass = isEvoFrom ? 'evo-selected evo-from' : isEvoTo ? 'evo-selected evo-to' : '';
    const picking = evoFromId !== null && evoToId === null && !isEvoFrom ? 'evo-pickable' : '';

    headHtml += `<th class="${selClass} ${picking}">
      <span class="header-date" onclick="selectEvoColumn(${m.id})" title="Clique para comparar">${formatDate(m.date)}</span>
      <span class="header-label">${m.label || ''}</span>
      <span class="header-actions">
        <button class="btn-icon btn-edit" onclick="editMeasurement(${m.id})" title="Editar">&#9998;</button>
        <button class="btn-icon btn-delete" onclick="deleteMeasurement(${m.id})" title="Excluir">&#10005;</button>
      </span>
    </th>`;
  });
  if (showEvolution) {
    if (hasCustomEvo) {
      headHtml += `<th class="col-evolution col-evolution-period">
        ${formatDate(evoFromM.date)} → ${formatDate(evoToM.date)}
        <button class="btn-icon btn-evo-clear" onclick="clearEvoSelection()" title="Voltar para evolução total">&#10005;</button>
      </th>`;
    } else {
      headHtml += '<th class="col-evolution">Evolução Total</th>';
    }
  }
  headHtml += '</tr>';
  tableHead.innerHTML = headHtml;

  // Build body
  let bodyHtml = '';
  FIELDS.forEach(field => {
    bodyHtml += `<tr data-field="${field.key}"><td class="cell-label"><span class="field-name">${field.label}</span>${field.unit ? ` <span class="field-unit">${field.unit}</span>` : ''}</td>`;
    bodyHtml += `<td class="cell-spark">${buildSparkline(field)}</td>`;
    measurements.forEach(m => {
      const val = m[field.key];
      const colClass = m.id === evoFromId || m.id === evoToId ? 'evo-col-highlight' : '';
      bodyHtml += `<td class="cell-value ${colClass}">${val != null ? `<span class="value-num">${val}</span>` : '<span class="value-empty">—</span>'}</td>`;
    });
    if (showEvolution) {
      if (hasCustomEvo) {
        bodyHtml += buildEvolutionCell(field, evoFromM, evoToM);
      } else {
        bodyHtml += buildEvolutionCell(field, first, last);
      }
    }
    bodyHtml += '</tr>';
  });
  tableBody.innerHTML = bodyHtml;
}

// Modal
function openModal(data = null) {
  form.reset();
  document.getElementById('form-id').value = '';
  if (data) {
    modalTitle.textContent = 'Editar Medição';
    document.getElementById('form-id').value = data.id;
    document.getElementById('form-date').value = data.date;
    document.getElementById('form-label').value = data.label || '';
    FIELDS.forEach(f => {
      const input = document.getElementById('form-' + f.key);
      if (input && data[f.key] != null) input.value = data[f.key];
    });
  } else {
    modalTitle.textContent = 'Nova Medição';
    document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
  }
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

btnNew.addEventListener('click', () => openModal());
btnCancel.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const body = {
    date: document.getElementById('form-date').value,
    label: document.getElementById('form-label').value,
  };
  FIELDS.forEach(f => {
    const val = document.getElementById('form-' + f.key).value;
    body[f.key] = val !== '' ? parseFloat(val) : null;
  });

  if (id) {
    await api('PUT', `/api/measurements/${id}`, body);
  } else {
    await api('POST', '/api/measurements', body);
  }

  closeModal();
  await loadData();
});

window.editMeasurement = function (id) {
  const m = measurements.find(x => x.id === id);
  if (m) openModal(m);
};

window.deleteMeasurement = async function (id) {
  if (!confirm('Excluir esta medição?')) return;
  await api('DELETE', `/api/measurements/${id}`);
  await loadData();
};

// Profile
const modalProfile = document.getElementById('modal-profile');
const profileForm = document.getElementById('profile-form');
let profileData = {};

async function loadProfile() {
  profileData = await api('GET', '/api/profile');
  return profileData;
}

document.getElementById('btn-profile').addEventListener('click', async () => {
  const p = await loadProfile();
  document.getElementById('profile-sexo').value = p.sexo || '';
  document.getElementById('profile-idade').value = p.idade || '';
  document.getElementById('profile-altura').value = p.altura || '';
  document.getElementById('profile-freq').value = p.freq || '';
  document.getElementById('profile-calorias').value = p.calorias || '';
  document.getElementById('profile-rotina').value = p.rotina || '';
  document.getElementById('profile-peso-meta').value = p.peso_meta || '';
  modalProfile.classList.remove('hidden');
});

document.getElementById('btn-profile-cancel').addEventListener('click', () => {
  modalProfile.classList.add('hidden');
});

modalProfile.addEventListener('click', e => { if (e.target === modalProfile) modalProfile.classList.add('hidden'); });

profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  profileData = await api('PUT', '/api/profile', {
    sexo: document.getElementById('profile-sexo').value,
    idade: document.getElementById('profile-idade').value,
    altura: document.getElementById('profile-altura').value,
    freq: document.getElementById('profile-freq').value,
    calorias: document.getElementById('profile-calorias').value,
    rotina: document.getElementById('profile-rotina').value,
    peso_meta: document.getElementById('profile-peso-meta').value,
  });
  modalProfile.classList.add('hidden');
  renderBodyGoal();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = 'Perfil salvo!';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
});

// Export Prompt
document.getElementById('btn-export-prompt').addEventListener('click', async () => {
  if (measurements.length === 0) {
    alert('Nenhuma medição para exportar.');
    return;
  }

  let prompt = `Analise minha evolução corporal e me dê feedbacks detalhados sobre meu progresso, pontos fortes, pontos de atenção e sugestões.\n\n`;

  const profile = await loadProfile();
  if (profile.sexo || profile.idade || profile.altura || profile.freq || profile.rotina || profile.peso_meta) {
    prompt += `--- Perfil ---\n`;
    if (profile.sexo) prompt += `Sexo: ${profile.sexo}\n`;
    if (profile.idade) prompt += `Idade: ${profile.idade} anos\n`;
    if (profile.altura) prompt += `Altura: ${profile.altura} cm\n`;
    if (profile.freq) prompt += `Treinos por semana: ${profile.freq}x\n`;
    if (profile.calorias) prompt += `Calorias por dia: ${profile.calorias} kcal\n`;
    if (profile.peso_meta) prompt += `Meta de peso: ${profile.peso_meta} kg\n`;
    if (profile.rotina) prompt += `Rotina: ${profile.rotina}\n`;
    prompt += '\n';
  }

  prompt += `Tenho ${measurements.length} medição(ões) registrada(s):\n\n`;

  measurements.forEach((m, i) => {
    prompt += `--- Medição ${i + 1}: ${formatDate(m.date)}${m.label ? ' (' + m.label + ')' : ''} ---\n`;
    FIELDS.forEach(f => {
      const val = m[f.key];
      if (val != null) prompt += `${f.label}: ${val} ${f.unit}\n`;
    });
    prompt += '\n';
  });

  if (measurements.length >= 2) {
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    prompt += `--- Evolução (${formatDate(first.date)} → ${formatDate(last.date)}) ---\n`;
    FIELDS.forEach(f => {
      const firstVal = first[f.key];
      const lastVal = last[f.key];
      if (firstVal != null && lastVal != null) {
        const diff = lastVal - firstVal;
        const sign = diff > 0 ? '+' : '';
        prompt += `${f.label}: ${sign}${diff.toFixed(1)} ${f.unit}\n`;
      }
    });
  }

  navigator.clipboard.writeText(prompt).then(() => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Prompt copiado! Cole em qualquer IA para análise.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2100);
  });
});

// Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// Migrar perfil do localStorage para o servidor (uma vez)
async function migrateProfile() {
  const old = localStorage.getItem('gym_profile');
  if (!old) return;
  try {
    const local = JSON.parse(old);
    const server = await api('GET', '/api/profile');
    const isEmpty = !server.sexo && !server.idade && !server.altura && !server.freq && !server.calorias && !server.rotina;
    if (isEmpty && (local.sexo || local.idade || local.altura || local.freq || local.calorias || local.rotina)) {
      await api('PUT', '/api/profile', local);
      localStorage.removeItem('gym_profile');
    } else {
      localStorage.removeItem('gym_profile');
    }
  } catch {}
}

// ======== TAB SWITCHING ========
const TAB_TITLES = {
  medicoes: 'Medições',
  agua: 'Água',
  treino: 'Treino',
  carga: 'Progressão de Carga',
};

const TAB_ACTIONS = {
  medicoes: ['btn-export-prompt', 'btn-new'],
  agua: ['btn-water-config-header'],
  treino: [],
  carga: ['btn-carga-new-header'],
};

function updateHeaderActions(tab) {
  const ALL = ['btn-export-prompt', 'btn-new'];
  const show = TAB_ACTIONS[tab] || [];
  ALL.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show.includes(id) ? '' : 'none';
  });
}

document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).classList.add('active');
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = TAB_TITLES[tab] || tab;
    updateHeaderActions(tab);
    document.querySelectorAll('.tab-panel.active').forEach(p => {
      p.classList.remove('panel-enter');
      void p.offsetWidth;
      p.classList.add('panel-enter');
    });
    if (tab === 'agua') loadWaterData();
    if (tab === 'treino') loadTreinoData();
    if (tab === 'carga') loadCargaData();
    if (window.innerWidth <= 800) {
      document.querySelector('.app-shell').classList.remove('sidebar-open');
    }
  });
});

// Sidebar toggle (mobile)
(function() {
  const toggle = document.getElementById('sidebar-toggle');
  const shell = document.querySelector('.app-shell');
  if (toggle && shell) {
    toggle.addEventListener('click', () => shell.classList.toggle('sidebar-open'));
    document.addEventListener('click', e => {
      if (window.innerWidth > 800) return;
      if (!shell.classList.contains('sidebar-open')) return;
      if (e.target.closest('.sidebar') || e.target.closest('#sidebar-toggle')) return;
      shell.classList.remove('sidebar-open');
    });
  }
})();

// ======== WATER TRACKER ========
let waterConfig = { bottle_size_ml: 500, daily_goal_ml: 3000 };
let waterIntake = [];
let waterStats = {};
let waterYear = new Date().getFullYear();

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

async function loadWaterData() {
  const [config, intake, stats] = await Promise.all([
    api('GET', '/api/water-config'),
    api('GET', `/api/water-intake?year=${waterYear}`),
    api('GET', '/api/water-intake/stats'),
  ]);
  waterConfig = config;
  waterIntake = intake;
  waterStats = stats;
  renderWaterUI();
}

function renderWaterUI() {
  // Stats
  document.getElementById('stat-streak').textContent = waterStats.currentStreak || 0;
  document.getElementById('stat-best').textContent = waterStats.bestStreak || 0;
  document.getElementById('stat-total').textContent = waterStats.totalLiters || 0;
  document.getElementById('stat-avg').textContent = ((waterStats.averageDaily || 0) / 1000).toFixed(1);

  // Progress bar for today
  const today = todayStr();
  const todayRecord = waterIntake.find(r => r.date === today);
  const todayBottles = todayRecord ? todayRecord.bottles : 0;
  const todayMl = todayBottles * waterConfig.bottle_size_ml;
  const goalMl = waterConfig.daily_goal_ml;
  const goalBottles = goalMl / waterConfig.bottle_size_ml;
  const pct = goalMl > 0 ? Math.min(100, (todayMl / goalMl) * 100) : 0;

  document.getElementById('progress-label').textContent = `Hoje: ${(todayMl / 1000).toFixed(1)} / ${(goalMl / 1000).toFixed(1)} L`;
  document.getElementById('progress-bottles').textContent = `${todayBottles} / ${goalBottles} garrafas`;
  document.getElementById('progress-bar').style.width = pct + '%';

  // 3D jar readout + level
  const jarCurEl = document.getElementById('jar-current-l');
  const jarGoalEl = document.getElementById('jar-goal-l');
  const jarPctEl = document.getElementById('jar-percent');
  if (jarCurEl) jarCurEl.textContent = (todayMl / 1000).toFixed(1);
  if (jarGoalEl) jarGoalEl.textContent = (goalMl / 1000).toFixed(1);
  if (jarPctEl) jarPctEl.textContent = Math.round(pct) + '%';
  const ratio = pct / 100;
  if (window.__waterJar) {
    window.__waterJar.setWaterLevel(ratio);
  } else {
    window.__pendingWaterLevel = ratio;
  }

  // Year label
  document.getElementById('heatmap-year').textContent = waterYear;

  renderHeatmap();
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  const monthsEl = document.getElementById('heatmap-months');
  grid.innerHTML = '';
  monthsEl.innerHTML = '';

  // Build lookup
  const lookup = {};
  waterIntake.forEach(r => { lookup[r.date] = r.bottles; });

  const goalBottles = waterConfig.daily_goal_ml / waterConfig.bottle_size_ml;

  // Start from Jan 1 of the year
  const jan1 = new Date(waterYear, 0, 1);
  const dec31 = new Date(waterYear, 11, 31);

  // Pad to start on Sunday (day 0)
  const startDay = jan1.getDay(); // 0=Sun
  const startDate = new Date(jan1);
  startDate.setDate(startDate.getDate() - startDay);

  // Generate cells
  const today = todayStr();
  let currentDate = new Date(startDate);

  while (currentDate <= dec31 || currentDate.getDay() !== 0) {
    const dateStr = currentDate.toLocaleDateString('en-CA');
    const inYear = currentDate.getFullYear() === waterYear;
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';

    if (!inYear) {
      cell.classList.add('empty');
    } else {
      const bottles = lookup[dateStr] || 0;
      const ratio = goalBottles > 0 ? bottles / goalBottles : 0;
      let level = 0;
      if (bottles > 0) {
        if (ratio >= 1) level = 4;
        else if (ratio >= 0.75) level = 3;
        else if (ratio >= 0.5) level = 2;
        else level = 1;
      }
      cell.classList.add('level-' + level);
      cell.dataset.date = dateStr;
      cell.dataset.bottles = bottles;
      cell.dataset.ml = bottles * waterConfig.bottle_size_ml;

      // Tooltip
      cell.addEventListener('mouseenter', e => {
        const tt = document.getElementById('heatmap-tooltip');
        const b = parseFloat(cell.dataset.bottles);
        const ml = parseFloat(cell.dataset.ml);
        const d = cell.dataset.date;
        tt.textContent = `${d}: ${(ml / 1000).toFixed(1)} L (${b} garrafas)`;
        tt.style.display = 'block';
        tt.style.left = e.clientX + 12 + 'px';
        tt.style.top = e.clientY - 30 + 'px';
      });
      cell.addEventListener('mouseleave', () => {
        document.getElementById('heatmap-tooltip').style.display = 'none';
      });

      // Click to edit
      cell.addEventListener('click', async () => {
        const d = cell.dataset.date;
        const current = parseFloat(cell.dataset.bottles) || 0;
        const input = prompt(`Garrafas para ${d}:`, current);
        if (input === null) return;
        const val = parseFloat(input);
        if (isNaN(val) || val < 0) return;
        if (val === 0) {
          await api('DELETE', `/api/water-intake/${d}`);
        } else {
          await api('POST', '/api/water-intake', { date: d, bottles: val });
        }
        await loadWaterData();
      });
    }

    grid.appendChild(cell);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Month labels
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  months.forEach(m => {
    const span = document.createElement('span');
    span.textContent = m;
    monthsEl.appendChild(span);
  });
}

// Add/remove bottle buttons
document.getElementById('btn-add-bottle').addEventListener('click', async () => {
  const today = todayStr();
  const existing = waterIntake.find(r => r.date === today);
  const bottles = (existing ? existing.bottles : 0) + 1;
  await api('POST', '/api/water-intake', { date: today, bottles });
  await loadWaterData();
  if (window.__waterJar && window.__waterJar.splash) window.__waterJar.splash();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `+1 garrafa! (${(bottles * waterConfig.bottle_size_ml / 1000).toFixed(1)} L hoje)`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
});

document.getElementById('btn-remove-bottle').addEventListener('click', async () => {
  const today = todayStr();
  const existing = waterIntake.find(r => r.date === today);
  const current = existing ? existing.bottles : 0;
  if (current <= 0) return;
  const bottles = current - 1;
  if (bottles === 0) {
    await api('DELETE', `/api/water-intake/${today}`);
  } else {
    await api('POST', '/api/water-intake', { date: today, bottles });
  }
  await loadWaterData();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `-1 garrafa (${(bottles * waterConfig.bottle_size_ml / 1000).toFixed(1)} L hoje)`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
});

// Water config modal
const modalWaterConfig = document.getElementById('modal-water-config');
const waterConfigForm = document.getElementById('water-config-form');
const wcGoalInput = document.getElementById('wc-daily-goal');
const wcBottleInput = document.getElementById('wc-bottle-size');
const wcPreview = document.getElementById('wc-preview');

function updateWcPreview() {
  const goal = parseFloat(wcGoalInput.value) || 0;
  const bottle = parseFloat(wcBottleInput.value) || 0.5;
  const count = (goal / bottle).toFixed(1);
  wcPreview.textContent = `Meta: ${goal} L/dia = ${count} garrafas de ${bottle} L`;
}

wcGoalInput.addEventListener('input', updateWcPreview);
wcBottleInput.addEventListener('input', updateWcPreview);

document.getElementById('btn-water-config').addEventListener('click', () => {
  wcGoalInput.value = waterConfig.daily_goal_ml / 1000;
  wcBottleInput.value = waterConfig.bottle_size_ml / 1000;
  updateWcPreview();
  modalWaterConfig.classList.remove('hidden');
});

document.getElementById('btn-wc-cancel').addEventListener('click', () => {
  modalWaterConfig.classList.add('hidden');
});

modalWaterConfig.addEventListener('click', e => {
  if (e.target === modalWaterConfig) modalWaterConfig.classList.add('hidden');
});

waterConfigForm.addEventListener('submit', async e => {
  e.preventDefault();
  await api('PUT', '/api/water-config', {
    daily_goal_ml: Math.round((parseFloat(wcGoalInput.value) || 3) * 1000),
    bottle_size_ml: Math.round((parseFloat(wcBottleInput.value) || 0.5) * 1000),
  });
  modalWaterConfig.classList.add('hidden');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = 'Configuracao salva!';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
  await loadWaterData();
});

// Year navigation
document.getElementById('btn-year-prev').addEventListener('click', () => {
  waterYear--;
  loadWaterData();
});

document.getElementById('btn-year-next').addEventListener('click', () => {
  waterYear++;
  loadWaterData();
});

// ======== TREINO TRACKER ========
let treinoData = [];
let treinoStats = {};
let treinoYear = new Date().getFullYear();
let treinoMonth = new Date().getMonth(); // 0-11
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const ICONS = {
  dumbbell: '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="1" y="8.5" width="2.5" height="7" rx="0.8"/><rect x="4" y="6" width="3" height="12" rx="0.8"/><rect x="7" y="10.5" width="10" height="3" rx="0.5"/><rect x="17" y="6" width="3" height="12" rx="0.8"/><rect x="20.5" y="8.5" width="2.5" height="7" rx="0.8"/></svg>',
  run: '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="15.5" cy="4.5" r="2.2"/><path d="M13 7.5 9 9l-3.5 4 1.5 1.4 3-2.6 1.6 1.9-2.4 4.2-3 1.6 1 1.8 4-2 2.4-4 1.4 2 1.5 4.5 2-.6L17 17l-1.5-4 2-2 2.2 2 2.3-.7-2.5-3.7-3-1.3z"/></svg>',
  ruler: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 8.7L8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2M10 8l2 2M12.5 5.5l2 2M5 13l2 2"/></svg>',
  drop: '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c-.4 0-.7.2-.9.5L6 11c-1.3 1.8-2 3.9-2 6 0 4.4 3.6 8 8 8s8-3.6 8-8c0-2.1-.7-4.2-2-6L12.9 3c-.2-.3-.5-.5-.9-.5z"/></svg>',
  chart: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>',
  user: '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg>',
  logout: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  file: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>',
  plus: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  flame: '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-1 4-4 5-4 9 0 1.5.5 2.5 1.5 3.5C8 14 7.5 12 9 10c.5 3 2 4 3 5 1.5 1.5 1 3.5-.5 4.5C15 19 18 17 18 13c0-5-3-7-6-11z"/></svg>',
  target: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  // Bonus
  edit: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  minus: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  settings: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  trending: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  award: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
  calendar: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
};
const ICON_DUMBBELL = ICONS.dumbbell;
const ICON_RUN = ICONS.run;

async function loadTreinoData() {
  const [data, stats] = await Promise.all([
    api('GET', `/api/treino?year=${treinoYear}`),
    api('GET', '/api/treino/stats'),
  ]);
  treinoData = data;
  treinoStats = stats;
  renderTreinoUI();
}

function renderTreinoUI() {
  // Stats
  document.getElementById('treino-stat-streak').textContent = treinoStats.currentStreak || 0;
  document.getElementById('treino-stat-best').textContent = treinoStats.bestStreak || 0;
  document.getElementById('treino-stat-musc').textContent = treinoStats.totalMusc || 0;
  document.getElementById('treino-stat-corrida').textContent = treinoStats.totalCorrida || 0;

  // Flame count (streak)
  const flameCount = document.getElementById('flame-count');
  if (flameCount) flameCount.textContent = treinoStats.currentStreak || 0;

  // Today status & activity buttons
  const today = todayStr();
  const todayRecord = treinoData.find(r => r.date === today);
  const statusEl = document.getElementById('treino-today-status');
  const muscBtn = document.getElementById('btn-today-musc');
  const corridaBtn = document.getElementById('btn-today-corrida');

  const hasMusc = !!(todayRecord && todayRecord.musculacao);
  const hasCorrida = !!(todayRecord && todayRecord.corrida);

  muscBtn.classList.toggle('active', hasMusc);
  corridaBtn.classList.toggle('active', hasCorrida);

  if (!hasMusc && !hasCorrida) {
    statusEl.textContent = 'Nenhum treino hoje';
  } else {
    const parts = [];
    if (hasMusc) parts.push(`<span class="status-chip status-musc">${ICONS.dumbbell} Musculação</span>`);
    if (hasCorrida) parts.push(`<span class="status-chip status-corrida">${ICONS.run} Corrida</span>`);
    statusEl.innerHTML = parts.join(' ');
  }

  // Month title
  document.getElementById('cal-title').textContent = `${MONTH_NAMES[treinoMonth]} ${treinoYear}`;

  renderTreinoCalendar();
}

async function toggleTodayActivity(activity) {
  const today = todayStr();
  const existing = treinoData.find(r => r.date === today);
  const body = {
    date: today,
    musculacao: existing ? existing.musculacao : 0,
    corrida: existing ? existing.corrida : 0,
  };
  body[activity] = body[activity] ? 0 : 1;
  await api('POST', '/api/treino', body);
  await loadTreinoData();
  const toast = document.createElement('div');
  toast.className = 'toast';
  const label = activity === 'musculacao' ? 'Musculação' : 'Corrida';
  toast.textContent = body[activity] ? `${label} registrada!` : `Removido: ${label}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
}

document.getElementById('btn-today-musc').addEventListener('click', () => toggleTodayActivity('musculacao'));
document.getElementById('btn-today-corrida').addEventListener('click', () => toggleTodayActivity('corrida'));

function renderTreinoCalendar() {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const lookup = {};
  treinoData.forEach(r => { lookup[r.date] = r; });

  // First day of month, last day
  const first = new Date(treinoYear, treinoMonth, 1);
  const last = new Date(treinoYear, treinoMonth + 1, 0);
  // Start the grid on Monday (cal-weekdays starts with S T Q Q S S D = Seg/Ter/Qua/Qui/Sex/Sab/Dom)
  // JS getDay(): 0=Sun, 1=Mon, ... 6=Sat
  // We want Mon=0, ..., Sun=6
  const firstDayWeek = (first.getDay() + 6) % 7;
  const startDate = new Date(first);
  startDate.setDate(startDate.getDate() - firstDayWeek);

  const today = todayStr();
  let cur = new Date(startDate);
  let idx = 0;

  while (true) {
    const dateStr = cur.toLocaleDateString('en-CA');
    const inMonth = cur.getMonth() === treinoMonth && cur.getFullYear() === treinoYear;
    const record = lookup[dateStr];
    const hasMusc = record && record.musculacao;
    const hasCorrida = record && record.corrida;

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.style.animationDelay = (idx * 0.015) + 's';
    if (!inMonth) cell.classList.add('outside');
    if (dateStr === today) cell.classList.add('today');
    if (hasMusc && hasCorrida) cell.classList.add('has-both');
    else if (hasMusc) cell.classList.add('has-musculacao');
    else if (hasCorrida) cell.classList.add('has-corrida');

    cell.dataset.date = dateStr;

    if (hasMusc || hasCorrida) {
      const icons = document.createElement('div');
      icons.className = 'cal-day-icons';
      if (hasMusc) {
        const i = document.createElement('span');
        i.className = 'icon';
        i.innerHTML = ICONS.dumbbell;
        icons.appendChild(i);
      }
      if (hasCorrida) {
        const i = document.createElement('span');
        i.className = 'icon';
        i.innerHTML = ICONS.run;
        icons.appendChild(i);
      }
      cell.appendChild(icons);
    } else {
      const num = document.createElement('span');
      num.className = 'day-num';
      num.textContent = cur.getDate();
      cell.appendChild(num);
    }

    if (inMonth) {
      cell.addEventListener('click', () => openTreinoDayPopup(dateStr, record));
    }

    grid.appendChild(cell);
    cur.setDate(cur.getDate() + 1);
    idx++;

    // Stop after completing the week that contains the last day of the month
    if (cur > last && ((cur.getDay() + 6) % 7) === 0) break;
    // Safety break
    if (idx > 42) break;
  }
}

function openTreinoDayPopup(date, record) {
  const existing = document.getElementById('treino-popup');
  if (existing) existing.remove();

  const hasMusc = record && record.musculacao;
  const hasCorrida = record && record.corrida;

  const popup = document.createElement('div');
  popup.id = 'treino-popup';
  popup.className = 'treino-popup';
  popup.innerHTML = `
    <p>${formatDate(date)}</p>
    <div class="treino-popup-activities">
      <button class="activity-btn ${hasMusc ? 'active' : ''}" data-activity="musculacao">
        <span class="activity-icon">${ICONS.dumbbell}</span>
        <span class="activity-label">Musculação</span>
      </button>
      <button class="activity-btn ${hasCorrida ? 'active' : ''}" data-activity="corrida">
        <span class="activity-icon">${ICONS.run}</span>
        <span class="activity-label">Corrida</span>
      </button>
    </div>
    <div class="treino-popup-actions">
      <button class="btn-secondary btn-sm" id="treino-popup-close">Fechar</button>
    </div>
  `;
  document.body.appendChild(popup);

  let state = { musculacao: hasMusc ? 1 : 0, corrida: hasCorrida ? 1 : 0 };

  popup.querySelectorAll('.activity-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const activity = btn.dataset.activity;
      state[activity] = state[activity] ? 0 : 1;
      btn.classList.toggle('active');
      await api('POST', '/api/treino', { date, musculacao: state.musculacao, corrida: state.corrida });
      await loadTreinoData();
    });
  });

  popup.querySelector('#treino-popup-close').addEventListener('click', () => popup.remove());
  setTimeout(() => {
    document.addEventListener('click', function outsideClose(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', outsideClose);
      }
    });
  }, 50);
}

// Calendar navigation
document.getElementById('btn-cal-prev').addEventListener('click', () => {
  treinoMonth--;
  if (treinoMonth < 0) { treinoMonth = 11; treinoYear--; }
  loadTreinoData();
});

document.getElementById('btn-cal-next').addEventListener('click', () => {
  treinoMonth++;
  if (treinoMonth > 11) { treinoMonth = 0; treinoYear++; }
  loadTreinoData();
});

// ======== PROGRESSAO DE CARGA ========
const EXERCISES = [
  'Supino Inclinado', 'Crucifixo', 'Paralela', 'Puxada Aberta', 'Remada Unila.',
  'Elevação Lat', 'Triceps Francês', 'Panturrilha sentado', 'Panturrilha em pé',
  'Leg 45 articulado', 'Hack', 'Cadeira extensora', 'Cadeira flexora', 'Abdução',
  'Rosca 45', 'Desenvolvimento', 'Elevação Front', 'Rosca Scott', 'Triceps Polia',
  'Smith na máquina', 'Mesa flexora', 'Adutor', 'Pux Art Uni', 'Puxada Neutra',
  'Remada Apoiada', 'Sup Inclinado', 'Crux Polia Alta', 'Crux Inverso', 'Rosca Direta'
];

let cargaData = [];

// Populate exercise dropdowns
function populateCargaSelects() {
  const mainSelect = document.getElementById('carga-exercise');
  const formSelect = document.getElementById('carga-form-exercise');
  [mainSelect, formSelect].forEach(sel => {
    sel.innerHTML = '';
    EXERCISES.forEach(ex => {
      const opt = document.createElement('option');
      opt.value = ex;
      opt.textContent = ex;
      sel.appendChild(opt);
    });
  });
}

populateCargaSelects();

document.getElementById('carga-exercise').addEventListener('change', loadCargaData);

async function loadCargaData() {
  const exercise = document.getElementById('carga-exercise').value;
  if (!exercise) return;
  cargaData = await api('GET', `/api/progressao?exercise=${encodeURIComponent(exercise)}`);
  renderCargaUI();
}

function renderCargaUI() {
  const tbody = document.getElementById('carga-table-body');
  const emptyEl = document.getElementById('carga-empty');
  const table = document.getElementById('carga-table');

  if (cargaData.length === 0) {
    table.style.display = 'none';
    emptyEl.style.display = '';
    document.getElementById('carga-stat-atual').textContent = '-';
    document.getElementById('carga-stat-max').textContent = '-';
    document.getElementById('carga-stat-total').textContent = '0';
    document.getElementById('carga-stat-evo').textContent = '-';
    renderCargaChart();
    return;
  }

  table.style.display = '';
  emptyEl.style.display = 'none';

  // Stats
  const last = cargaData[cargaData.length - 1];
  const first = cargaData[0];
  const maxWeight = Math.max(...cargaData.map(r => r.weight));
  const evoPct = first.weight > 0
    ? (((last.weight - first.weight) / first.weight) * 100).toFixed(1)
    : '-';

  document.getElementById('carga-stat-atual').textContent = last.weight;
  document.getElementById('carga-stat-max').textContent = maxWeight;
  document.getElementById('carga-stat-total').textContent = cargaData.length;
  document.getElementById('carga-stat-evo').textContent = evoPct !== '-' ? evoPct + '%' : '-';

  // Table
  let html = '';
  cargaData.forEach((r, i) => {
    let evoHtml = '<span class="carga-evo-same">-</span>';
    if (i > 0) {
      const diff = r.weight - cargaData[i - 1].weight;
      if (diff > 0) evoHtml = `<span class="carga-evo-up">+${diff.toFixed(1)}kg</span>`;
      else if (diff < 0) evoHtml = `<span class="carga-evo-down">${diff.toFixed(1)}kg</span>`;
      else evoHtml = '<span class="carga-evo-same">0</span>';
    }
    html += `<tr>
      <td>${formatDate(r.date)}</td>
      <td>${r.weight}</td>
      <td>${r.sets}</td>
      <td>${r.reps}</td>
      <td>${evoHtml}</td>
      <td>
        <button class="btn-icon btn-edit" onclick="editCarga(${r.id})" title="Editar">&#9998;</button>
        <button class="btn-icon btn-delete" onclick="deleteCarga(${r.id})" title="Excluir">&#10005;</button>
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;

  renderCargaChart();
}

function renderCargaChart() {
  const canvas = document.getElementById('carga-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr - 32 * dpr;
  canvas.height = 220 * dpr;
  canvas.style.width = (rect.width - 32) + 'px';
  canvas.style.height = '220px';
  ctx.scale(dpr, dpr);

  const w = rect.width - 32;
  const h = 220;
  ctx.clearRect(0, 0, w, h);

  if (cargaData.length < 2) {
    ctx.fillStyle = '#666';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Adicione pelo menos 2 registros para ver o grafico', w / 2, h / 2);
    return;
  }

  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const weights = cargaData.map(r => r.weight);
  const minW = Math.floor(Math.min(...weights) - 2);
  const maxW = Math.ceil(Math.max(...weights) + 2);
  const range = maxW - minW || 1;

  // Grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + ch - (i / gridLines) * ch;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText((minW + (i / gridLines) * range).toFixed(0), pad.left - 8, y + 4);
  }

  // Line
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  cargaData.forEach((r, i) => {
    const x = pad.left + (i / (cargaData.length - 1)) * cw;
    const y = pad.top + ch - ((r.weight - minW) / range) * ch;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Points
  cargaData.forEach((r, i) => {
    const x = pad.left + (i / (cargaData.length - 1)) * cw;
    const y = pad.top + ch - ((r.weight - minW) / range) * ch;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc3f7';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X-axis labels (show a few dates)
  ctx.fillStyle = '#888';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  const maxLabels = Math.min(cargaData.length, 8);
  const step = Math.max(1, Math.floor(cargaData.length / maxLabels));
  for (let i = 0; i < cargaData.length; i += step) {
    const x = pad.left + (i / (cargaData.length - 1)) * cw;
    ctx.fillText(formatDate(cargaData[i].date), x, h - pad.bottom + 18);
  }
  // Always show last
  if ((cargaData.length - 1) % step !== 0) {
    const x = pad.left + cw;
    ctx.fillText(formatDate(cargaData[cargaData.length - 1].date), x, h - pad.bottom + 18);
  }
}

// Modal carga
const modalCarga = document.getElementById('modal-carga');
const cargaForm = document.getElementById('carga-form');

document.getElementById('btn-carga-new').addEventListener('click', () => {
  cargaForm.reset();
  document.getElementById('carga-form-id').value = '';
  document.getElementById('modal-carga-title').textContent = 'Novo Registro de Carga';
  document.getElementById('carga-form-date').value = todayStr();
  document.getElementById('carga-form-exercise').value = document.getElementById('carga-exercise').value;
  modalCarga.classList.remove('hidden');
});

document.getElementById('btn-carga-cancel').addEventListener('click', () => {
  modalCarga.classList.add('hidden');
});

modalCarga.addEventListener('click', e => {
  if (e.target === modalCarga) modalCarga.classList.add('hidden');
});

cargaForm.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('carga-form-id').value;
  const body = {
    date: document.getElementById('carga-form-date').value,
    exercise: document.getElementById('carga-form-exercise').value,
    weight: parseFloat(document.getElementById('carga-form-weight').value) || 0,
    sets: parseInt(document.getElementById('carga-form-sets').value) || 0,
    reps: parseInt(document.getElementById('carga-form-reps').value) || 0,
  };
  if (id) {
    await api('PUT', `/api/progressao/${id}`, body);
  } else {
    await api('POST', '/api/progressao', body);
  }
  modalCarga.classList.add('hidden');
  // Switch main dropdown to the exercise that was saved
  document.getElementById('carga-exercise').value = body.exercise;
  await loadCargaData();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = 'Registro salvo!';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
});

window.editCarga = function(id) {
  const r = cargaData.find(x => x.id === id);
  if (!r) return;
  document.getElementById('carga-form-id').value = r.id;
  document.getElementById('modal-carga-title').textContent = 'Editar Registro de Carga';
  document.getElementById('carga-form-date').value = r.date;
  document.getElementById('carga-form-exercise').value = r.exercise;
  document.getElementById('carga-form-weight').value = r.weight;
  document.getElementById('carga-form-sets').value = r.sets;
  document.getElementById('carga-form-reps').value = r.reps;
  modalCarga.classList.remove('hidden');
};

window.deleteCarga = async function(id) {
  if (!confirm('Excluir este registro?')) return;
  await api('DELETE', `/api/progressao/${id}`);
  await loadCargaData();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = 'Registro excluido';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
};

// Toggle body diagram
(function() {
  const btn = document.getElementById('btn-toggle-body');
  const card = document.getElementById('body-card');
  if (!btn || !card) return;
  const saved = localStorage.getItem('gym_body_visible');
  if (saved === '0') {
    card.classList.add('collapsed');
    btn.textContent = 'Mostrar';
  }
  btn.addEventListener('click', () => {
    const isCollapsed = card.classList.toggle('collapsed');
    btn.textContent = isCollapsed ? 'Mostrar' : 'Ocultar';
    localStorage.setItem('gym_body_visible', isCollapsed ? '0' : '1');
  });
})();

function injectIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    if (ICONS[name] && !el.dataset.iconLoaded) {
      el.innerHTML = ICONS[name];
      el.dataset.iconLoaded = '1';
    }
  });
}

// Init
injectIcons();
updateHeaderActions('medicoes');
loadData();
migrateProfile();
loadProfile().then(renderBodyGoal).catch(() => {});
