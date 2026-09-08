// Estimativa de calorias gastas no treino.
//
// Modelo: MET ajustado pela intensidade da carga.
//   kcal = MET × (gasto em repouso por minuto) × minutos × (1 + EPOC)
//
// - Gasto em repouso: Mifflin-St Jeor (sexo, idade, altura, peso). Sem esses dados,
//   cai no padrão do Compendium (1 MET = 3,5 ml O2/kg/min ≈ 0,0175 kcal/kg/min).
// - MET base por tipo do exercício (Compendium of Physical Activities: musculação
//   leve 3,5 / moderada 5,0 / vigorosa 6,0). A carga relativa ao peso corporal e ao
//   recorde pessoal empurra o MET pra cima.
// - Minutos: estimados a partir das séries (tempo de execução + descanso). Não há
//   cronômetro no app; é a maior fonte de erro e o primeiro lugar a melhorar.
// - EPOC: +7% pra musculação (queima pós-treino), 0 pra cardio.
// - Cardio: com tempo + distância registrados, caminhada/corrida usa o MET pela
//   velocidade (tabela do Compendium, interpolada). Sem distância, MET fixo por
//   modalidade (bike, elíptico, corda...). Sem nada, 20 min no MET da modalidade.
//
// É uma ESTIMATIVA (margem de ±25%). Serve pra comparar dias e cruzar com a dieta,
// não pra contabilidade exata.

const TIPO_PARAMS = {
  //           MET base  seg/rep  descanso(s)  MET máx
  composto: { met: 5.0, secRep: 3.5, rest: 90, max: 7.5 },
  isolado:  { met: 3.5, secRep: 3.0, rest: 60, max: 5.5 },
  corporal: { met: 4.0, secRep: 3.0, rest: 60, max: 6.0 },
  cardio:   { met: 7.0, secRep: 0,   rest: 0,  max: 12 },
};
const EPOC = 0.07;
const SETUP_MIN = 1.5;  // troca de aparelho / ajuste de carga por exercício
const SETUP_MET = 2.5;
const DEFAULT_PESO = 70;
const DEFAULT_CARDIO_MIN = 20;

// MET por velocidade (km/h) para caminhada/corrida em piso plano — Compendium 2011
// (caminhada 3,2→2,8 · 4,8→3,5 · 5,6→4,3 · 6,4→5,0 · 7,2→7,0; corrida 8→8,3 · 9,7→9,8
//  · 11,3→11,0 · 12,9→11,8 · 14,5→12,8 · 16→14,5). Entre pontos, interpola.
const SPEED_MET = [
  [2.0, 2.0], [3.2, 2.8], [4.0, 3.0], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 7.0],
  [8.0, 8.3], [9.7, 9.8], [11.3, 11.0], [12.9, 11.8], [14.5, 12.8], [16.1, 14.5], [19.3, 19.0],
];

// MET fixo por modalidade quando não dá pra usar velocidade
const CARDIO_MODALITY = [
  [/bicicleta|bike|spinning|ciclismo/, 6.8],
  [/eliptico|transport/, 5.0],
  [/pular corda|corda/, 11.0],
  [/remo/, 7.0],
  [/escada|stairmaster|stair/, 9.0],
  [/natacao|nado/, 6.0],
  [/caminhada/, 4.3],
  [/corrida|esteira/, 7.0],
];

function isFootCardio(name) {
  const n = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /corrida|esteira|caminhada|trote|cooper/.test(n) && !/bicicleta|bike/.test(n);
}

function modalityMet(name) {
  const n = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hit = CARDIO_MODALITY.find(([re]) => re.test(n));
  return hit ? hit[1] : TIPO_PARAMS.cardio.met;
}

function metForSpeed(kmh) {
  if (!(kmh > 0)) return null;
  if (kmh <= SPEED_MET[0][0]) return SPEED_MET[0][1];
  for (let i = 1; i < SPEED_MET.length; i++) {
    const [s0, m0] = SPEED_MET[i - 1];
    const [s1, m1] = SPEED_MET[i];
    if (kmh <= s1) return m0 + ((kmh - s0) / (s1 - s0)) * (m1 - m0);
  }
  return SPEED_MET[SPEED_MET.length - 1][1];
}

// MET de um bloco de cardio: velocidade quando é a pé e tem distância, senão modalidade
function cardioMet(name, minutes, distanceKm) {
  if (isFootCardio(name) && minutes > 0 && distanceKm > 0) {
    return metForSpeed(distanceKm / (minutes / 60));
  }
  return modalityMet(name);
}

function paramsFor(tipo) {
  return TIPO_PARAMS[tipo] || TIPO_PARAMS.isolado;
}

// kcal por minuto em repouso (1 MET) para esta pessoa
function restingKcalPerMin({ peso, sexo, idade, altura }) {
  const p = peso > 0 ? peso : DEFAULT_PESO;
  const sx = String(sexo || '').trim().toLowerCase().charAt(0); // 'm' | 'f' | ''
  if (idade > 0 && altura > 0 && (sx === 'm' || sx === 'f')) {
    const bmr = 10 * p + 6.25 * altura - 5 * idade + (sx === 'm' ? 5 : -161);
    return Math.max(bmr, 800) / 1440;
  }
  return p * 0.0175;
}

// Lê "3 × 10-12", "4x8", "3 x 12" → { sets, reps }; "30 min" → { minutes }
function parseScheme(scheme) {
  const s = String(scheme || '').toLowerCase();
  const min = s.match(/(\d+)\s*min/);
  if (min) return { minutes: parseInt(min[1], 10) };
  const m = s.match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[-–a]\s*(\d+))?/);
  if (m) {
    const lo = parseInt(m[2], 10);
    const hi = m[3] ? parseInt(m[3], 10) : lo;
    return { sets: parseInt(m[1], 10), reps: Math.round((lo + hi) / 2) };
  }
  const only = s.match(/^\s*(\d+)/);
  return { sets: only ? parseInt(only[1], 10) : 3, reps: 10 };
}

// Ajuste do MET pela intensidade da carga.
// bwRatio = carga / peso corporal; prRatio = carga / recorde pessoal no exercício.
function intensityBump(tipo, bwRatio, prRatio) {
  let byBw = 0;
  if (tipo === 'composto') byBw = bwRatio >= 1.2 ? 2.0 : bwRatio >= 0.9 ? 1.5 : bwRatio >= 0.6 ? 1.0 : bwRatio >= 0.35 ? 0.5 : 0;
  else if (tipo === 'isolado') byBw = bwRatio >= 0.5 ? 1.5 : bwRatio >= 0.3 ? 1.0 : bwRatio >= 0.15 ? 0.5 : 0;
  else if (tipo === 'corporal') byBw = bwRatio >= 0.4 ? 1.5 : bwRatio >= 0.2 ? 1.0 : bwRatio > 0 ? 0.5 : 0;
  let byPr = 0;
  if (prRatio > 0) byPr = prRatio >= 0.95 ? 1.0 : prRatio >= 0.8 ? 0.5 : 0;
  return Math.max(byBw, byPr);
}

/**
 * Estima as calorias de UM exercício numa sessão.
 * @param {object} ex  { name, tipo, sets: [{weight, reps}], scheme, currentWeight, prWeight, minutes }
 * @param {object} person { peso, sexo, idade, altura }
 * @returns {{ kcal, minutes, met, sets, reps, topWeight, source }}
 */
function estimateExercise(ex, person) {
  const tipo = TIPO_PARAMS[ex.tipo] ? ex.tipo : 'isolado';
  const P = paramsFor(tipo);
  const restKcal = restingKcalPerMin(person);
  const peso = person.peso > 0 ? person.peso : DEFAULT_PESO;

  if (tipo === 'cardio') {
    // Blocos registrados (tempo + distância) > minutos avulsos > esquema do plano ("30 min")
    let blocks = Array.isArray(ex.cardio) ? ex.cardio.filter(b => b && b.minutes > 0) : [];
    let source = 'series';
    if (!blocks.length && ex.minutes > 0) blocks = [{ minutes: ex.minutes, distance_km: ex.distance_km || 0 }];
    if (!blocks.length) {
      const sch = parseScheme(ex.scheme);
      blocks = [{ minutes: sch.minutes || DEFAULT_CARDIO_MIN, distance_km: 0 }];
      source = 'plano';
    }
    let kcal = 0, minutes = 0, distance = 0;
    blocks.forEach(b => {
      const met = cardioMet(ex.name, b.minutes, b.distance_km);
      kcal += met * restKcal * b.minutes;
      minutes += b.minutes;
      distance += b.distance_km > 0 ? b.distance_km : 0;
    });
    const met = minutes > 0 ? kcal / (restKcal * minutes) : P.met;
    return {
      kcal: Math.round(kcal),
      minutes: Math.round(minutes),
      met: Math.round(met * 10) / 10,
      sets: 0, reps: 0, topWeight: 0,
      distance: Math.round(distance * 100) / 100,
      blocks: blocks.length,
      source,
    };
  }

  // Séries reais registradas > esquema do plano
  let sets = Array.isArray(ex.sets) ? ex.sets.filter(s => s && s.weight >= 0) : [];
  let source = 'series';
  if (!sets.length) {
    const sch = parseScheme(ex.scheme);
    const w = ex.currentWeight > 0 ? ex.currentWeight : 0;
    sets = Array.from({ length: Math.max(1, sch.sets || 3) }, () => ({ weight: w, reps: sch.reps || 10 }));
    source = 'plano';
  }

  const totalReps = sets.reduce((a, s) => a + (s.reps > 0 ? s.reps : 10), 0);
  const topWeight = Math.max(0, ...sets.map(s => s.weight || 0));
  // Média ponderada da carga pelas reps (representa melhor a sessão que só o top set)
  const avgWeight = sets.reduce((a, s) => a + (s.weight || 0) * (s.reps > 0 ? s.reps : 10), 0) / Math.max(totalReps, 1);

  const bump = intensityBump(tipo, avgWeight / peso, ex.prWeight > 0 ? topWeight / ex.prWeight : 0);
  const met = Math.min(P.met + bump, P.max);

  // Tempo: execução + descanso após cada série (inclusive a última, antes do próximo
  // exercício) + troca de aparelho/ajuste (ritmo leve, ~2,5 MET).
  const workSec = totalReps * P.secRep;
  const restSec = sets.length * P.rest;
  const minutes = (workSec + restSec) / 60 + SETUP_MIN;

  const kcal = (met * restKcal * (workSec + restSec) / 60 + SETUP_MET * restKcal * SETUP_MIN) * (1 + EPOC);
  return {
    kcal: Math.round(kcal),
    minutes: Math.round(minutes * 10) / 10,
    met: Math.round(met * 10) / 10,
    sets: sets.length,
    reps: totalReps,
    topWeight,
    source,
  };
}

module.exports = { estimateExercise, restingKcalPerMin, parseScheme, cardioMet, metForSpeed, TIPO_PARAMS, DEFAULT_PESO };
