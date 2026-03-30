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

function render() {
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

  // Build header
  let headHtml = '<tr><th>Medida</th>';
  measurements.forEach(m => {
    headHtml += `<th>
      <span>${formatDate(m.date)}</span>
      <span class="header-label">${m.label || ''}</span>
      <span class="header-actions">
        <button class="btn-icon btn-edit" onclick="editMeasurement(${m.id})" title="Editar">&#9998;</button>
        <button class="btn-icon btn-delete" onclick="deleteMeasurement(${m.id})" title="Excluir">&#10005;</button>
      </span>
    </th>`;
  });
  if (showEvolution) {
    headHtml += '<th class="col-evolution">Evolução Total</th>';
  }
  headHtml += '</tr>';
  tableHead.innerHTML = headHtml;

  // Build body
  let bodyHtml = '';
  FIELDS.forEach(field => {
    bodyHtml += `<tr><td>${field.label}</td>`;
    measurements.forEach(m => {
      const val = m[field.key];
      bodyHtml += `<td>${val != null ? val : '-'}</td>`;
    });
    if (showEvolution) {
      const firstVal = first[field.key];
      const lastVal = last[field.key];
      if (firstVal != null && lastVal != null) {
        const diff = lastVal - firstVal;
        const sign = diff > 0 ? '+' : '';
        let cls = 'neutral';
        if (field.type === 'waist') {
          // Para cintura, diminuir é bom
          if (diff < 0) cls = 'positive';
          else if (diff > 0) cls = 'warning';
        } else {
          // Para músculos/peso, aumentar é bom
          if (diff > 0) cls = 'positive';
          else if (diff < 0) cls = 'negative';
        }
        bodyHtml += `<td class="evolution ${cls}">${sign}${diff.toFixed(1)}</td>`;
      } else {
        bodyHtml += '<td class="evolution neutral">-</td>';
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
  });
  modalProfile.classList.add('hidden');
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
  if (profile.sexo || profile.idade || profile.altura || profile.freq || profile.rotina) {
    prompt += `--- Perfil ---\n`;
    if (profile.sexo) prompt += `Sexo: ${profile.sexo}\n`;
    if (profile.idade) prompt += `Idade: ${profile.idade} anos\n`;
    if (profile.altura) prompt += `Altura: ${profile.altura} cm\n`;
    if (profile.freq) prompt += `Treinos por semana: ${profile.freq}x\n`;
    if (profile.calorias) prompt += `Calorias por dia: ${profile.calorias} kcal\n`;
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
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'agua') loadWaterData();
  });
});

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

// Init
loadData();
migrateProfile();
