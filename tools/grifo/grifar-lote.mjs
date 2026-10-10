// Grifo das pistas-chave pela API de lotes (Message Batches, 50% mais barata).
//   node tools/grifo/grifar-lote.mjs <questoes.json> <saida-dir>
// Mesmas regras e portões de grifar.mjs, em duas etapas: lote de grifo →
// portões automáticos → lote de conferência. O estado fica em saida-dir/lote.json,
// então rodar de novo retoma de onde parou (inclusive esperando um lote em curso).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chave, REGRAS, VERIFICA, json, comando, validarPistas } from './grifar.mjs';

const MODELO = process.env.GRIFO_MODELO || 'claude-opus-5-5';
const VERIFICADOR = process.env.GRIFO_VERIFICADOR || 'claude-sonnet-5-5';
const API = 'https://api.anthropic.com/v1/messages/batches';

const corpo = b => typeof b === 'string' ? JSON.parse(b) : b;
const alternativasDe = b => b.alternatives.map(a => `${a.id}) ${a.text}`).join('\n');
const pedidoGrifo = b => {
  const just = [b.pearl, ...b.alternatives.map(a => a.rationale ? `${a.id}: ${a.rationale}` : '')].filter(Boolean).join('\n');
  return `ENUNCIADO:\n${b.stem}\n\nALTERNATIVAS:\n${alternativasDe(b)}\n\nGABARITO: ${b.correct}\n\nJUSTIFICATIVA DA BANCA/EDITORIAL:\n${just}`;
};
const params = (modelo, system, user, max) => ({ model: modelo, max_tokens: max,
  system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: user }] });

async function api(apiKey, url, opcoes = {}) {
  for (let t = 1; ; t++) {
    const r = await fetch(url, { ...opcoes, headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });
    if ((r.status === 429 || r.status >= 500) && t < 6) { await new Promise(s => setTimeout(s, 3000 * t)); continue; }
    if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r;
  }
}

// Envia (ou retoma) um lote e devolve Map custom_id → {texto, uso} | {erro}.
async function rodarLote(apiKey, estado, nome, requisicoes, salvar) {
  if (!estado[nome]) {
    if (!requisicoes.length) return new Map();
    const r = await api(apiKey, API, { method: 'POST', body: JSON.stringify({ requests: requisicoes }) });
    estado[nome] = (await r.json()).id; await salvar();
    console.log(`Lote ${nome} enviado: ${requisicoes.length} pedidos`);
  }
  let info;
  for (;;) {
    info = await (await api(apiKey, `${API}/${estado[nome]}`)).json();
    if (info.processing_status === 'ended') break;
    await new Promise(s => setTimeout(s, 60000));
  }
  const linhas = (await (await api(apiKey, info.results_url)).text()).split('\n').filter(Boolean);
  const saida = new Map();
  for (const l of linhas) {
    const x = JSON.parse(l);
    if (x.result.type === 'succeeded') {
      const m = x.result.message;
      saida.set(x.custom_id, { texto: m.content.filter(c => c.type === 'text').map(c => c.text).join(''), uso: m.usage });
    } else saida.set(x.custom_id, { erro: x.result.type });
  }
  return saida;
}

async function main() {
  const [entrada, saidaDir] = process.argv.slice(2);
  if (!entrada || !saidaDir) throw new Error('uso: node tools/grifo/grifar-lote.mjs <questoes.json> <saida-dir>');
  const bruto = await readFile(entrada, 'utf8');
  const linhas = JSON.parse(bruto.slice(bruto.indexOf('{'))).rows.map(l => ({ id: String(l.id), b: corpo(l.body) }));
  await mkdir(saidaDir, { recursive: true });
  const arqEstado = path.join(saidaDir, 'lote.json');
  const estado = await readFile(arqEstado, 'utf8').then(JSON.parse).catch(() => ({}));
  const salvar = () => writeFile(arqEstado, JSON.stringify(estado, null, 2));
  const apiKey = await chave();
  const uso = {};
  const somar = (m, u) => { const s = (uso[m] ||= { in: 0, out: 0, cacheR: 0, cacheW: 0 }); s.in += u.input_tokens || 0; s.out += u.output_tokens || 0; s.cacheR += u.cache_read_input_tokens || 0; s.cacheW += u.cache_creation_input_tokens || 0; };
  const cid = id => id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);

  const resultados = new Map(linhas.map(({ id, b }) => [id, { id, fonte: b.source, area: b.area, stem: b.stem, correct: b.correct, pistas: [], descartes: [], verificacao: null, status: '' }]));
  const elegiveis = linhas.filter(({ id, b }) => {
    if ((b.images || []).length || b.alternativesInImage) { Object.assign(resultados.get(id), { status: 'sem pistas', motivo: 'questão com figura' }); return false; }
    return true;
  });

  const grifos = await rodarLote(apiKey, estado, 'grifo',
    elegiveis.map(({ id, b }) => ({ custom_id: cid(id), params: params(MODELO, REGRAS, pedidoGrifo(b), 1200) })), salvar);
  const conferir = [];
  for (const { id, b } of elegiveis) {
    const r = resultados.get(id), g = grifos.get(cid(id));
    if (!g || g.erro) { r.status = 'erro: lote ' + (g?.erro || 'sem resposta'); continue; }
    somar(MODELO, g.uso);
    try {
      const resp = json(g.texto);
      const v = resp.decisao_pistas === 'sem_pistas' ? { pistas: [], descartes: [] } : validarPistas(b.stem, resp.pistas_chave);
      Object.assign(r, { pistas: v.pistas, descartes: v.descartes, motivo: resp.motivo || '' });
      if (!v.pistas.length) r.status = v.descartes.length ? 'reprovada: nenhuma pista válida' : 'sem pistas';
      else conferir.push({ id, b, r });
    } catch (e) { r.status = 'erro: ' + e.message.slice(0, 120); }
  }
  const conf = await rodarLote(apiKey, estado, 'conferencia', conferir.map(({ id, b, r }) => ({ custom_id: cid(id),
    params: params(VERIFICADOR, VERIFICA, `PISTAS:\n${r.pistas.map(p => '- ' + p.trecho).join('\n')}\n\nCOMANDO: ${comando(b.stem)}\n\nALTERNATIVAS:\n${alternativasDe(b)}`, 600) })), salvar);
  for (const { id, b, r } of conferir) {
    const c = conf.get(cid(id));
    if (!c || c.erro) { r.status = 'erro: conferência ' + (c?.erro || 'sem resposta'); continue; }
    somar(VERIFICADOR, c.uso);
    try { r.verificacao = json(c.texto); r.status = r.verificacao.letra === b.correct ? 'aprovada' : 'reprovada: pistas não levam ao gabarito'; }
    catch { r.status = 'reprovada: conferente sem resposta clara'; }
  }
  const lista = [...resultados.values()];
  await writeFile(path.join(saidaDir, 'grifos.json'), JSON.stringify({ modelo: MODELO, verificador: VERIFICADOR, lote: true, uso, resultados: lista }, null, 2));
  const cont = {}; lista.forEach(x => { const k = x.status.split(':')[0]; cont[k] = (cont[k] || 0) + 1; });
  console.log('Resumo:', JSON.stringify(cont));
  console.log('Uso de tokens (preço de lote):', JSON.stringify(uso));
}

await main();
