import { currentPilotContract, pilotQuestionAllowed } from './pilot-runtime.mjs';
import { createPrivateImageView } from './private-image-ui.mjs';
import { createClient } from '@supabase/supabase-js';
import { resolveIdentity } from './auth-contract.mjs';
import { validateAuthConfig } from './config-contract.mjs';
import { buildSession, catalogFilter, errorNotebook, filterPool, latestAttempts, pending, questionYear, validQuestion } from './amrigs-core.mjs';

const el = id => document.getElementById(`amrigs-${id}`);
const show = (id, yes) => { el(id).hidden = !yes; };
const set = (id, value) => { el(id).textContent = value; };
let client, identity, questions = [], attempts = [], session = null, feedbackId = null;
let epoch = 0;
let imageView, pilotContract, imagesReady = false;
let activeQuestionId = null, questionOpenedAt = 0;
const byId = () => new Map(questions.map(q => [q.id, q]));
function option(label, value) { return new Option(label, value); }
function imageNodes(images) { return imageView.mount(images).nodes; }
function clearPrivateView() {
  imageView?.clear(); imagesReady = false;
  for (const id of ['setup', 'activity', 'summary', 'notebook', 'catalog']) show(id, false);
  el('images').replaceChildren(); el('errors').replaceChildren(); el('catalog-list').replaceChildren();
  el('form').querySelector('button').disabled = true;
}
function setupOptions() {
  const f = el('setup-form').elements;
  const areas = [...new Set(questions.map(q => q.body.area).filter(Boolean))].sort();
  const years = [...new Set(questions.map(q => q.body.source?.match(/AMRIGS · (\d{4}) ·/)?.[1]).filter(Boolean))].sort().reverse();
  f.area.replaceChildren(option('Todas', ''), ...areas.map(a => option(a, a)));
  f.year.replaceChildren(option('Todos', ''), ...years.map(y => option(y, y)));
}
function configFromForm() {
  const f = el('setup-form').elements;
  return { quantity: Number(f.quantity.value), areas: f.area.value ? [f.area.value] : [],
    years: f.year.value ? [Number(f.year.value)] : [], priority: f.priority.value };
}
function renderNotebook() {
  const errors = errorNotebook(questions, attempts);
  show('notebook', true);
  set('history', `${attempts.length} resposta(s) no histórico desta conta · ${errors.length} questão(ões) no caderno.`);
  el('review').disabled = !errors.length;
  el('errors').replaceChildren(...errors.map(q => {
    const details = document.createElement('details'), summary = document.createElement('summary'), stem = document.createElement('p');
    summary.textContent = `${q.body.area || 'Área não classificada'} · ${q.body.source || 'AMRIGS'} · ${q.body.topic || 'Tema não classificado'}`;
    stem.textContent = q.body.stem; details.append(summary, stem, ...imageNodes(q.body.images));
    for (const a of q.body.alternatives) {
      const p = document.createElement('p');
      p.textContent = `${a.id}. ${q.body.alternativesInImage ? `Alternativa ${a.id} na figura` : a.text}${a.id === q.body.correct ? ' — correta' : ''} ${a.rationale || ''}`;
      details.append(p);
    }
    const pearl = document.createElement('p'); pearl.textContent = q.body.pearl || '';
    details.append(pearl); return details;
  }));
}
function renderQuestion(q) {
  const b = q.body, finished = feedbackId === q.id;
  if (activeQuestionId !== q.id) { activeQuestionId = q.id; questionOpenedAt = Date.now(); }
  show('activity', true); show('setup', false); show('summary', false);
  set('progress', `Questão ${Object.keys(session.answered).length + (finished ? 0 : 1)} de ${session.questionIds.length}`);
  set('title', b.stem); set('source', `${b.area || ''} · ${b.source || 'AMRIGS'}`);
  imagesReady = false;
  const button = el('form').querySelector('button'); button.disabled = true;
  el('skip').hidden = true; show('figure-note', false);
  const required = b.images || [];
  const mounted = imageView.mount(required, { onReady(ok) {
    // Figura que não carrega não pode travar a sessão: se as alternativas estão
    // no texto, o aluno responde pelo enunciado; se estão na figura, pula.
    imagesReady = ok || !b.alternativesInImage;
    button.disabled = finished || !imagesReady;
    const falhou = !ok && required.length > 0 && !finished;
    el('skip').hidden = !falhou;
    show('figure-note', falhou);
    if (falhou) set('figure-note', b.alternativesInImage
      ? 'A figura desta questão não carregou e as alternativas estão nela. Use "Pular esta questão" para seguir.'
      : 'A figura não carregou. Você pode responder pelo enunciado ou pular esta questão.');
  } });
  el('images').replaceChildren(...mounted.nodes);
  const latest = latestAttempts(attempts).get(q.id);
  el('options').replaceChildren(...b.alternatives.map(a => {
    const label = document.createElement('label'), radio = document.createElement('input'), span = document.createElement('span');
    radio.type = 'radio'; radio.name = 'answer'; radio.value = a.id; radio.required = true;
    if (finished) { radio.disabled = true; radio.checked = latest?.answer === a.id; }
    span.textContent = `${a.id}. ${b.alternativesInImage ? `Alternativa ${a.id} na figura` : a.text}`;
    label.append(radio, span);
    if (finished && a.rationale) { const detail = document.createElement('small'); detail.textContent = a.rationale; label.append(detail); }
    return label;
  }));
  show('form', true); el('form').querySelector('button').hidden = finished;
  show('feedback', finished); show('next', finished);
  if (finished) {
    el('feedback').replaceChildren();
    const heading = document.createElement('strong'), pearl = document.createElement('p');
    heading.textContent = latest?.is_correct ? 'Boa decisão clínica.' : 'Vamos transformar o erro em revisão.';
    pearl.textContent = b.pearl || ''; el('feedback').append(heading, pearl);
    set('next', pending(session).length ? 'Próxima questão' : 'Ver resultado');
  }
}
function renderSummary() {
  show('summary', true); show('activity', false); show('setup', false);
  const entries = Object.entries(session.answered), correct = entries.filter(([, ok]) => ok).length;
  set('score', `${correct} de ${entries.length} (${entries.length ? Math.round(correct / entries.length * 100) : 0}%).`);
  const areas = new Map(), lookup = byId();
  for (const [id, ok] of entries) {
    const area = lookup.get(id)?.body.area || 'Outra';
    const count = areas.get(area) || { total: 0, correct: 0 };
    count.total++; if (ok) count.correct++; areas.set(area, count);
  }
  el('area-summary').replaceChildren(...[...areas].map(([area, n]) => {
    const p = document.createElement('p'); p.textContent = `${area}: ${n.correct}/${n.total}`; return p;
  }));
}
// ---------- Catálogo docente (consulta; nenhuma tentativa é gravada) ----------
const CATALOGO_PAGINA = 30;
let catalogShown = CATALOGO_PAGINA;
function catalogSetup() {
  const f = el('catalog-form').elements;
  const areas = [...new Set(questions.map(q => q.body.area).filter(Boolean))].sort();
  const years = [...new Set(questions.map(questionYear).filter(Boolean))].sort().reverse();
  f.area.replaceChildren(option('Todas', ''), ...areas.map(a => option(a, a)));
  f.year.replaceChildren(option('Todos', ''), ...years.map(y => option(String(y), String(y))));
}
function catalogItem(q) {
  const b = q.body, details = document.createElement('details'), summary = document.createElement('summary');
  details.className = 'amrigs-catalog-item';
  summary.textContent = `${b.source || 'AMRIGS'} · ${b.area || 'Área não classificada'}${b.topic ? ' · ' + b.topic : ''}`;
  details.append(summary);
  // Conteúdo e figuras só quando o docente abre a questão (evita baixar tudo).
  details.addEventListener('toggle', () => {
    if (!details.open || details.dataset.montado) return;
    details.dataset.montado = '1';
    const stem = document.createElement('p'); stem.textContent = b.stem;
    details.append(stem, ...imageNodes(b.images));
    for (const a of b.alternatives) {
      const div = document.createElement('div'), texto = document.createElement('span');
      div.className = 'alt' + (a.id === b.correct ? ' correta' : '');
      texto.textContent = `${a.id}. ${b.alternativesInImage ? 'Alternativa ' + a.id + ' na figura' : a.text}${a.id === b.correct ? ' — gabarito' : ''}`;
      div.append(texto);
      if (a.rationale) { const s = document.createElement('small'); s.textContent = a.rationale; div.append(s); }
      details.append(div);
    }
    if (b.pearl) { const p = document.createElement('p'); p.className = 'perola'; p.textContent = b.pearl; details.append(p); }
  });
  return details;
}
function renderCatalog() {
  for (const id of ['setup', 'activity', 'summary', 'notebook']) show(id, false);
  show('catalog', true);
  const f = el('catalog-form').elements;
  const lista = catalogFilter(questions, { area: f.area.value, year: f.year.value, q: f.q.value });
  set('catalog-count', `${lista.length} de ${questions.length} questões.`);
  el('catalog-list').replaceChildren(...lista.slice(0, catalogShown).map(catalogItem));
  el('catalog-more').hidden = lista.length <= catalogShown;
}
function render() {
  imageView?.clear(); imagesReady = false;
  for (const id of ['setup', 'activity', 'summary', 'notebook']) show(id, false);
  if (!questions.length) { set('status', 'O treino AMRIGS ainda não está disponível para a sua conta.'); return; }
  set('status', `${questions.length} questões disponíveis para treino.`);
  renderNotebook();
  if (!session) { show('setup', true); setupOptions(); el('setup-form').dispatchEvent(new Event('change')); return; }
  const lookup = byId(), next = pending(session).find(id => lookup.has(id));
  const q = feedbackId ? lookup.get(feedbackId) : next ? lookup.get(next) : null;
  if (q) renderQuestion(q); else renderSummary();
}
async function saveSession() {
  const row = { user_id: identity.subject, config: session.config, question_ids: session.questionIds,
    answered: session.answered, started_at: session.startedAt };
  const { error } = await client.from('capi_training_sessions').upsert(row);
  if (error) throw error;
}
async function closeSession() {
  const { error } = await client.from('capi_training_sessions').delete().eq('user_id', identity.subject);
  if (error) throw error;
  session = null; feedbackId = null; render();
}
async function refresh() {
  const current = ++epoch;
  clearPrivateView(); questions = []; attempts = []; session = null; feedbackId = null;
  try {
    identity = await resolveIdentity(client);
    if (current !== epoch) return;
    if (!identity) { location.replace('/entrar?next=%2Famrigs%2F'); return; }
    set('account', `${identity.name} · ${identity.label}`);
    if (['professor', 'admin'].includes(identity.role)) {
      const q = await client.from('capi_training_questions').select('id,body').eq('context', 'AMRIGS').eq('editorial_status', 'human_reviewed').eq('student_visible', true);
      if (q.error) throw q.error;
      if (current !== epoch) return;
      questions = q.data.filter(validQuestion).filter(value => pilotQuestionAllowed(pilotContract, value.id));
      if (!questions.length) { set('status', 'O catálogo docente ainda não está disponível para a sua conta.'); return; }
      set('status', 'Catálogo docente: consulta às questões liberadas para os alunos.');
      catalogShown = CATALOGO_PAGINA; catalogSetup(); renderCatalog(); return;
    }
    if (!['aluno', 'egresso'].includes(identity.role)) { set('status', 'O treino está disponível somente para estudantes.'); return; }
    const [q, a, s] = await Promise.all([
      client.from('capi_training_questions').select('id,body').eq('context', 'AMRIGS').eq('editorial_status', 'human_reviewed').eq('student_visible', true),
      client.from('capi_training_attempts').select('id,question_id,answer,is_correct,created_at').eq('user_id', identity.subject).order('created_at').order('id'),
      client.from('capi_training_sessions').select('config,question_ids,answered,started_at').eq('user_id', identity.subject).maybeSingle(),
    ]);
    if (q.error || a.error || s.error) throw q.error || a.error || s.error;
    if (current !== epoch) return;
    questions = q.data.filter(validQuestion).filter(value => pilotQuestionAllowed(pilotContract, value.id)); attempts = a.data;
    session = s.data ? { config: s.data.config, questionIds: s.data.question_ids,
      answered: s.data.answered, startedAt: s.data.started_at } : null;
    render();
  } catch { if (current === epoch) set('status', 'Não foi possível carregar o treino. Verifique a conexão e tente novamente.'); }
}
async function busy(button, task) {
  button.disabled = true;
  try { await task(); } catch { set('status', 'A operação não foi salva. Tente novamente.'); }
  finally { button.disabled = button === el('form').querySelector('button') ? !imagesReady : false; }
}
try {
  const response = await fetch('/auth-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('No configuration');
  const config = await response.json();
  validateAuthConfig(config);
  client = createClient(config.url, config.key, { auth: { flowType: 'pkce', storageKey: config.storageKey,
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  pilotContract = config.privateImages?.contract;
  imageView = createPrivateImageView({ client, contract: config.privateImages?.contract,
    hashes: config.privateImages?.hashes || {}, document });
  client.auth.onAuthStateChange(() => { epoch++; clearPrivateView(); setTimeout(refresh, 0); });
  window.addEventListener('pagehide', () => { epoch++; clearPrivateView(); });
  el('setup-form').addEventListener('change', () => {
    const config = configFromForm();
    const pool = filterPool(questions, config);
    const effective = Math.min(config.quantity, pool.length);
    set('pool', `Disponíveis nos filtros: ${pool.length}. Solicitadas: ${config.quantity}. Esta sessão terá ${effective} ${effective === 1 ? 'questão' : 'questões'}.`);
    el('setup-form').querySelector('button').disabled = !pool.length;
  });
  el('setup-form').addEventListener('submit', event => {
    event.preventDefault();
    void busy(event.submitter, async () => {
      session = buildSession(questions, attempts, configFromForm()); await saveSession(); render();
    });
  });
  el('form').addEventListener('submit', event => {
    event.preventDefault();
    void busy(event.submitter, async () => {
      const id = pending(session).find(value => byId().has(value));
      const answer = new FormData(event.target).get('answer');
      if (!id || !answer || !imagesReady || !['aluno', 'egresso'].includes(identity?.role) || !pilotQuestionAllowed(pilotContract, id)) return;
      const result = await client.from('capi_training_attempts')
        .insert({ user_id: identity.subject, question_id: id, answer, confidence: 2,
          response_time_ms: Math.max(0, Date.now() - questionOpenedAt) })
        .select('id,question_id,answer,is_correct,created_at').single();
      if (result.error) throw result.error;
      attempts.push(result.data); session.answered[id] = result.data.is_correct; feedbackId = id;
      try { await saveSession(); } catch { set('status', 'Resposta salva; posição não sincronizou. Recarregue para tentar novamente.'); }
      render();
    });
  });
  el('next').addEventListener('click', () => { feedbackId = null; render(); });
  // Pular: tira a questão desta sessão (sem registrar tentativa) e segue.
  el('skip').addEventListener('click', event => {
    void busy(event.currentTarget, async () => {
      const id = pending(session).find(value => byId().has(value));
      if (!id) return;
      session.questionIds = session.questionIds.filter(value => value !== id);
      await saveSession(); feedbackId = null; render();
    });
  });
  el('catalog-form').addEventListener('input', () => { catalogShown = CATALOGO_PAGINA; imageView.clear(); renderCatalog(); });
  el('catalog-form').addEventListener('submit', event => event.preventDefault());
  el('catalog-more').addEventListener('click', () => { catalogShown += CATALOGO_PAGINA; renderCatalog(); });
  el('abandon').addEventListener('click', event => { void busy(event.currentTarget, closeSession); });
  el('new').addEventListener('click', event => { void busy(event.currentTarget, closeSession); });
  el('review').addEventListener('click', event => {
    void busy(event.currentTarget, async () => {
      const errors = errorNotebook(questions, attempts);
      session = buildSession(errors, attempts, { quantity: errors.length, areas: [], years: [], priority: 'erros' });
      await saveSession(); render();
    });
  });
  // Só o piloto tem prazo; a liberação institucional não expira no navegador.
  if (pilotContract?.scope === 'pilot' && currentPilotContract(pilotContract)) {
    setTimeout(() => { epoch++; clearPrivateView(); set('status', 'O prazo deste piloto encerrou.'); },
      Math.max(0, Date.parse(pilotContract.expiresAt) - Date.now()));
  }
  window.addEventListener('pageshow', refresh);
  await refresh();
} catch { set('status', 'O treino AMRIGS local não está disponível.'); }
