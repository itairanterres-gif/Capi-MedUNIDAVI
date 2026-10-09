// Recovered from Treino's session.ts and App.tsx review rule. Keep the
// question bank and attempts authoritative in Supabase, never in localStorage.
export function pending(session) {
  return session.questionIds.filter(id => !(id in session.answered));
}
// Newest timestamp wins. Exact timestamp ties use ascending attempt UUID;
// array order is only a stable fallback for old fixtures without attempt IDs.
export function latestAttempts(attempts) {
  const fraction = a => (String(a.created_at || '').match(/\.(\d+)/)?.[1] || '').padEnd(9, '0').slice(3, 9);
  const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const sorted = attempts.map((attempt, index) => ({ attempt, index })).sort((a, b) =>
    ((Date.parse(a.attempt.created_at) || 0) - (Date.parse(b.attempt.created_at) || 0))
    || compareText(fraction(a.attempt), fraction(b.attempt))
    || compareText(String(a.attempt.id || ''), String(b.attempt.id || ''))
    || a.index - b.index);
  const latest = new Map();
  for (const { attempt } of sorted) latest.set(attempt.question_id, attempt);
  return latest;
}
export function errorNotebook(questions, attempts) {
  const visible = new Map(questions.map(q => [q.id, q]));
  return [...latestAttempts(attempts)].filter(([id, a]) => a.is_correct === false && visible.has(id))
    .map(([id]) => visible.get(id));
}
function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function filterPool(questions, config) {
  return questions.filter(q =>
    (!config.areas.length || config.areas.includes(q.body.area)) &&
    (!config.years.length || config.years.some(year => q.body.source?.includes(`AMRIGS · ${year} ·`))));
}
export function buildSession(questions, attempts, config, random = Math.random) {
  const pool = filterPool(questions, config);
  const seen = latestAttempts(attempts);
  const unseen = [], wrong = [], mastered = [];
  for (const q of pool) {
    if (!seen.has(q.id)) unseen.push(q);
    else if (seen.get(q.id).is_correct !== true) wrong.push(q);
    else mastered.push(q);
  }
  const ordered = config.priority === 'ineditas' ? [...shuffle(unseen, random), ...shuffle(wrong, random), ...shuffle(mastered, random)]
    : config.priority === 'erros' ? [...shuffle(wrong, random), ...shuffle(unseen, random), ...shuffle(mastered, random)]
      : shuffle(pool, random);
  return { config, questionIds: ordered.slice(0, config.quantity).map(q => q.id), answered: {}, startedAt: new Date().toISOString() };
}
export function validQuestion(q) {
  const b = q?.body;
  return !!(b && typeof b.stem === 'string' && ['A', 'B', 'C', 'D'].includes(b.correct)
    && Array.isArray(b.alternatives) && b.alternatives.length >= 2
    && b.alternatives.every(a => ['A', 'B', 'C', 'D'].includes(a?.id) && typeof a.text === 'string'));
}
// Catálogo docente: filtra por área, ano (da fonte "AMRIGS · 2019 · …") e
// texto livre (enunciado, tema, área), sem acentos e sem diferença de caixa.
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function questionYear(q) { return Number(q.body?.source?.match(/AMRIGS · (\d{4}) ·/)?.[1]) || null; }
export function catalogFilter(questions, { area = '', year = '', q = '' } = {}) {
  const termo = semAcento(q).trim();
  return questions.filter(item => (!area || item.body.area === area) && (!year || questionYear(item) === Number(year)) &&
    (!termo || semAcento([item.body.stem, item.body.topic, item.body.area].join(' ')).includes(termo)))
    .sort((a, b) => (questionYear(b) || 0) - (questionYear(a) || 0) || String(a.body.source).localeCompare(String(b.body.source), 'pt-BR', { numeric: true }));
}
