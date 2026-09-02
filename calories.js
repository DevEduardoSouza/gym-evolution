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
    const sch = parseScheme(ex.scheme);
    const minutes = ex.minutes > 0 ? ex.minutes : (sch.minutes || DEFAULT_CARDIO_MIN);
    const met = P.met;
    return { kcal: Math.round(met * restKcal * minutes), minutes, met, sets: 0, reps: 0, topWeight: 0, source: ex.minutes > 0 ? 'series' : 'plano' };
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

module.exports = { estimateExercise, restingKcalPerMin, parseScheme, TIPO_PARAMS, DEFAULT_PESO };
