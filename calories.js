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
// - Inclinação: subir custa mais que andar no plano. O MET plano é multiplicado pelo
//   fator das equações metabólicas do ACSM (ver gradeFactor). Só vale pra cardio a pé.
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

// Inverso de metForSpeed: a velocidade que aquele MET representa no plano. Usado
// quando a modalidade dá o MET mas não há distância pra calcular a velocidade.
function speedForMet(met) {
  if (!(met > 0)) return 0;
  if (met <= SPEED_MET[0][1]) return SPEED_MET[0][0];
  for (let i = 1; i < SPEED_MET.length; i++) {
    const [s0, m0] = SPEED_MET[i - 1];
    const [s1, m1] = SPEED_MET[i];
    if (met <= m1) return s0 + ((met - m0) / (m1 - m0)) * (s1 - s0);
  }
  return SPEED_MET[SPEED_MET.length - 1][0];
}

const MAX_GRADE_PCT = 30; // acima disso vira escalada; a equação do ACSM não vale mais

// Quanto a inclinação encarece o esforço, pelas equações metabólicas do ACSM:
//   caminhada: VO2 = 0,1 × S + 1,8 × S × G + 3,5
//   corrida:   VO2 = 0,2 × S + 0,9 × S × G + 3,5
// (S = velocidade em m/min, G = inclinação em fração). O retorno é a razão
// VO2(G) / VO2(0) na mesma velocidade, que multiplica o MET plano — assim, em 0%
// o fator é 1 e a estimativa continua idêntica à de antes. Entre 6,4 e 8 km/h,
// onde o ACSM troca de equação, os coeficientes são interpolados.
function gradeFactor(kmh, inclinePct) {
  const g = Math.min(Math.max(inclinePct || 0, 0), MAX_GRADE_PCT) / 100;
  if (!(g > 0) || !(kmh > 0)) return 1;
  const s = (kmh * 1000) / 60;
  const t = kmh <= 6.4 ? 0 : kmh >= 8 ? 1 : (kmh - 6.4) / 1.6;
  const horiz = 0.1 + t * (0.2 - 0.1);
  const vert = 1.8 + t * (0.9 - 1.8);
  const flat = horiz * s + 3.5;
  return (flat + vert * s * g) / flat;
}

// MET de um bloco de cardio: velocidade quando é a pé e tem distância, senão
// modalidade. A inclinação só entra no cardio a pé (esteira, caminhada, corrida).
function cardioMet(name, minutes, distanceKm, inclinePct) {
  if (!isFootCardio(name)) return modalityMet(name);
  if (minutes > 0 && distanceKm > 0) {
    const kmh = distanceKm / (minutes / 60);
    return metForSpeed(kmh) * gradeFactor(kmh, inclinePct);
  }
  // Sem distância: parte do MET da modalidade e da velocidade que ele representa
  const met = modalityMet(name);
  return met * gradeFactor(speedForMet(met), inclinePct);
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
    if (!blocks.length && ex.minutes > 0) blocks = [{ minutes: ex.minutes, distance_km: ex.distance_km || 0, incline_pct: ex.incline_pct || 0 }];
    if (!blocks.length) {
      const sch = parseScheme(ex.scheme);
      blocks = [{ minutes: sch.minutes || DEFAULT_CARDIO_MIN, distance_km: 0, incline_pct: 0 }];
      source = 'plano';
    }
    let kcal = 0, minutes = 0, distance = 0, inclineMin = 0;
    blocks.forEach(b => {
      const met = cardioMet(ex.name, b.minutes, b.distance_km, b.incline_pct);
      kcal += met * restKcal * b.minutes;
      minutes += b.minutes;
      distance += b.distance_km > 0 ? b.distance_km : 0;
      inclineMin += (b.incline_pct > 0 ? b.incline_pct : 0) * b.minutes;
    });
    const met = minutes > 0 ? kcal / (restKcal * minutes) : P.met;
    return {
      kcal: Math.round(kcal),
      minutes: Math.round(minutes),
      met: Math.round(met * 10) / 10,
      sets: 0, reps: 0, topWeight: 0,
      distance: Math.round(distance * 100) / 100,
      // Inclinação média do dia, ponderada pelo tempo de cada bloco
      incline: minutes > 0 ? Math.round((inclineMin / minutes) * 10) / 10 : 0,
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

module.exports = { estimateExercise, restingKcalPerMin, parseScheme, cardioMet, metForSpeed, gradeFactor, MAX_GRADE_PCT, TIPO_PARAMS, DEFAULT_PESO };
