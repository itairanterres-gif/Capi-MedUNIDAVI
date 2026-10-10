// Grifo das pistas-chave (estilo AMBOSS) — piloto.
//   node tools/grifo/grifar.mjs <questoes.json> <saida-dir>
// Entrada: export {rows:[{id, body}]} de capi_training_questions.
// Para cada questão: um modelo forte escolhe 0–3 trechos LITERAIS e únicos do enunciado
// que levam à resposta; portões automáticos descartam o que não for literal ou
// grifar o comando; um segundo modelo confere se só as pistas levam ao gabarito.
// Sem revisão humana: questão reprovada fica SEM grifo, nunca com grifo ruim.
//
// Chave: ANTHROPIC_API_KEY do ambiente ou, com autorização do Itairan
// (09/10/2026), somente essa variável lida da configuração do Hermes.
// A chave nunca é impressa nem gravada.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const MODELO = process.env.GRIFO_MODELO || 'claude-opus-5-5';
const VERIFICADOR = process.env.GRIFO_VERIFICADOR || 'claude-sonnet-5-5';

export async function chave() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const env = await readFile(path.join(process.env.LOCALAPPDATA, 'hermes', '.env'), 'utf8');
  const m = env.match(/^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m);
  if (!m) throw new Error('ANTHROPIC_API_KEY não encontrada na configuração do Hermes');
  return m[1].trim();
}

// Regras da skill "analise-questoes-residencia" v1.3, seção 15A (Codex, 30/09/2026).
export const REGRAS = `Você é professor de medicina revisando questões de residência já respondidas pelo estudante.
Tarefa: marcar as PISTAS-CHAVE do enunciado — uma camada editorial vinculada ao texto oficial, não uma
reescrita nem uma dica acrescentada. Elas ensinam a separar dados discriminativos de contexto e só
aparecem DEPOIS da primeira resposta (gabarito e justificativa abaixo).

Regras obrigatórias:
- cada trecho_exato deve existir literalmente e UMA ÚNICA VEZ no enunciado; não normalize, corrija ou parafraseie;
- em geral de um a três trechos curtos e não sobrepostos; zero é uma decisão válida;
- destaque somente informação que muda diagnóstico, gravidade, temporalidade, conduta ou exclusão de alternativa competitiva;
- não destaque o comando, palavras apenas porque se repetem na alternativa correta, dados decorativos ou pistas de construção da prova;
- funcao_no_raciocinio: por que o trecho é discriminativo (até 20 palavras, português do Brasil), sem criar fato clínico ausente;
- se a função depender de figura ausente, ou não houver pista localizada inequívoca: decisao_pistas "sem_pistas" e motivo. Na dúvida, não grife.

Responda SOMENTE com JSON:
{"decisao_pistas":"oferecer|sem_pistas","motivo":"...","pistas_chave":[{"trecho_exato":"...","funcao_no_raciocinio":"..."}]}`;

async function chamar(apiKey, modelo, system, user, maxTokens = 800) {
  for (let tentativa = 1; ; tentativa++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: modelo, max_tokens: maxTokens,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }] }),
    });
    if (r.status === 429 || r.status >= 500) {
      if (tentativa >= 5) throw new Error(`API ${r.status}`);
      await new Promise(res => setTimeout(res, 2000 * tentativa)); continue;
    }
    const d = await r.json();
    if (!r.ok) throw new Error(`API ${r.status}: ${d?.error?.message || 'erro'}`);
    return { texto: d.content.filter(c => c.type === 'text').map(c => c.text).join(''), uso: d.usage };
  }
}

export function json(texto) {
  const i = texto.indexOf('{'), j = texto.lastIndexOf('}');
  if (i < 0 || j < i) throw new Error('resposta sem JSON: ' + texto.slice(0, 160).replace(/s+/g, ' '));
  return JSON.parse(texto.slice(i, j + 1));
}

// Último período do enunciado = comando (ex.: "...é:" ou "...provável?").
export function comando(stem) {
  const partes = stem.trim().split(/(?<=[.!?])\s+/);
  return partes[partes.length - 1];
}

export function validarPistas(stem, pistas) {
  const cmd = comando(stem);
  const inicioCmd = stem.lastIndexOf(cmd);
  const ok = [], descartes = [];
  for (const p of pistas || []) {
    const trecho = String(p.trecho_exato ?? p.trecho ?? '');
    const pos = trecho ? stem.indexOf(trecho) : -1;
    if (pos < 0) { descartes.push({ trecho, motivo: 'não é literal' }); continue; }
    if (stem.indexOf(trecho, pos + 1) >= 0) { descartes.push({ trecho, motivo: 'não é único' }); continue; }
    if (pos >= inicioCmd) { descartes.push({ trecho, motivo: 'grifa o comando' }); continue; }
    if (trecho.split(/\s+/).length > 18) { descartes.push({ trecho, motivo: 'longo demais' }); continue; }
    if (ok.some(o => pos < o.fim && pos + trecho.length > o.inicio)) { descartes.push({ trecho, motivo: 'sobreposto' }); continue; }
    ok.push({ inicio: pos, fim: pos + trecho.length, trecho, porque: String(p.funcao_no_raciocinio ?? p.porque ?? '').trim() });
  }
  ok.sort((a, b) => a.inicio - b.inicio);
  return { pistas: ok.slice(0, 3), descartes };
}

export const VERIFICA = `Você recebe apenas algumas PISTAS de um caso clínico, o COMANDO da questão e as alternativas.
Usando só essas informações e conhecimento médico, qual alternativa é a correta?
Responda SOMENTE com JSON: {"letra":"X","confianca":"alta|media|baixa"}`;

async function main() {
  const [entrada, saidaDir] = process.argv.slice(2);
  if (!entrada || !saidaDir) throw new Error('uso: node tools/grifo/grifar.mjs <questoes.json> <saida-dir>');
  const bruto = await readFile(entrada, 'utf8');
  const linhas = JSON.parse(bruto.slice(bruto.indexOf('{'))).rows;
  const apiKey = await chave();
  await mkdir(saidaDir, { recursive: true });
  const uso = { [MODELO]: { in: 0, out: 0, cacheR: 0, cacheW: 0 }, [VERIFICADOR]: { in: 0, out: 0, cacheR: 0, cacheW: 0 } };
  const somar = (m, u) => { const s = uso[m]; s.in += u.input_tokens || 0; s.out += u.output_tokens || 0; s.cacheR += u.cache_read_input_tokens || 0; s.cacheW += u.cache_creation_input_tokens || 0; };
  // Retomável: o que já está em grifos.json não é refeito (exceto erros).
  const arquivo = path.join(saidaDir, 'grifos.json');
  const anterior = await readFile(arquivo, 'utf8').then(JSON.parse).catch(() => null);
  const resultados = (anterior?.resultados || []).filter(r => !r.status.startsWith('erro'));
  const feitos = new Set(resultados.map(r => r.id));
  const fila = linhas.filter(l => !feitos.has(l.id));
  let gravando = Promise.resolve();
  const gravar = () => (gravando = gravando.then(() => writeFile(arquivo, JSON.stringify({ modelo: MODELO, verificador: VERIFICADOR, uso, resultados }, null, 2))));
  let proximo = 0;
  async function trabalhador() { while (proximo < fila.length) { const i = proximo++; await processar(fila[i], i); } }
  async function processar(linha, i) {
    const b = typeof linha.body === 'string' ? JSON.parse(linha.body) : linha.body;
    const alternativas = b.alternatives.map(a => `${a.id}) ${a.text}`).join('\n');
    const justificativa = [b.pearl, ...b.alternatives.map(a => a.rationale ? `${a.id}: ${a.rationale}` : '')].filter(Boolean).join('\n');
    const pedido = `ENUNCIADO:\n${b.stem}\n\nALTERNATIVAS:\n${alternativas}\n\nGABARITO: ${b.correct}\n\nJUSTIFICATIVA DA BANCA/EDITORIAL:\n${justificativa}`;
    const r = { id: linha.id, fonte: b.source, area: b.area, stem: b.stem, correct: b.correct, pistas: [], descartes: [], verificacao: null, status: '' };
    if ((b.images || []).length || b.alternativesInImage) { r.status = 'sem pistas'; r.motivo = 'questão com figura'; resultados.push(r); return; }
    try {
      const g = await chamar(apiKey, MODELO, REGRAS, pedido);
      somar(MODELO, g.uso);
      const resposta = json(g.texto);
      const v = resposta.decisao_pistas === 'sem_pistas' ? { pistas: [], descartes: [] } : validarPistas(b.stem, resposta.pistas_chave);
      r.motivo = resposta.motivo || '';
      r.pistas = v.pistas; r.descartes = v.descartes;
      if (!v.pistas.length) r.status = v.descartes.length ? 'reprovada: nenhuma pista válida' : 'sem pistas';
      else {
        const conf = await chamar(apiKey, VERIFICADOR, VERIFICA,
          `PISTAS:\n${v.pistas.map(p => '- ' + p.trecho).join('\n')}\n\nCOMANDO: ${comando(b.stem)}\n\nALTERNATIVAS:\n${alternativas}`, 600);
        somar(VERIFICADOR, conf.uso);
        r.verificacao = json(conf.texto);
        r.status = r.verificacao.letra === b.correct ? 'aprovada' : 'reprovada: pistas não levam ao gabarito';
      }
    } catch (e) { r.status = 'erro: ' + e.message; }
    resultados.push(r);
    if (resultados.length % 10 === 0) await gravar();
    if (r.status.startsWith('erro')) console.log(`${r.status} · ${r.fonte}`);
  }
  await Promise.all(Array.from({ length: Number(process.env.GRIFO_PARALELO || 3) }, trabalhador));
  await gravar();
  const cont = {}; resultados.forEach(x => { const k = x.status.split(':')[0]; cont[k] = (cont[k] || 0) + 1; });
  console.log('Resumo:', JSON.stringify(cont));
  console.log('Uso de tokens:', JSON.stringify(uso));
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
