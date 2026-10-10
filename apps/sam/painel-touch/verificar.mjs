// Verificação do painel touch, pôster por pôster, no tamanho real (1080×1920).
//   node apps/sam/painel-touch/verificar.mjs [pasta-de-capturas] [--dados=site/outro.json]
//
// 1. INTEGRIDADE (bloqueia): todo texto do aluno exibido na vitrine e na
//    leitura é comparado, caractere por caractere, com o JSON de origem; e o
//    texto completo tem de aparecer inteiro na leitura. Uma diferença
//    qualquer reprova o pôster e o script termina com erro.
// 2. SINALIZAÇÕES (não bloqueiam, não corrigem nada): seções que não deu
//    para separar, vitrine que precisa rolar, figura em baixa resolução,
//    trecho repetido no texto. Vão para o aluno ou a curadoria decidir.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url)); // apps/sam/
const args = process.argv.slice(2);
const capturas = args.find((a) => !a.startsWith('--')) || null;
const arqDados = (args.find((a) => a.startsWith('--dados=')) || '--dados=site/xi_sam.json').slice(8);

let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  const global = execSync('npm root -g').toString().trim();
  ({ chromium } = createRequire(path.join(global, 'x.js'))('playwright'));
}

const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const servidor = createServer(async (req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const arq = path.join(raiz, p);
  if (!arq.startsWith(raiz)) { res.writeHead(403).end(); return; }
  try { const corpo = await readFile(arq); res.writeHead(200, { 'content-type': tipos[path.extname(arq)] || 'application/octet-stream' }).end(corpo); }
  catch { res.writeHead(404).end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => servidor.once('listening', r));
const base = `http://127.0.0.1:${servidor.address().port}/painel-touch/index.html?real=1&dados=${encodeURIComponent('../' + arqDados)}`;

const dados = JSON.parse(await readFile(path.join(raiz, arqDados), 'utf8'));
const posters = dados.trabalhos.filter((t) => t.camada === 'poster_tc1' && (t.statusCuradoria == null || t.statusCuradoria === 'publicado'));

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 } });
if (capturas) await mkdir(capturas, { recursive: true });

function esperado(t, secoes) {
  const m = new Map([['titulo', t.titulo], ['autor', t.autor], ['orientador', t.orientador], ['afiliacao', t.afiliacao],
    ['referencias', t.referencias], ['resumo', t.resumo]]);
  (Array.isArray(t.autores) && t.autores.length ? t.autores : [t.autor]).forEach((a, i) => m.set(`autores:${i}`, a));
  (t.palavras || []).forEach((w, i) => m.set(`palavras:${i}`, w));
  (t.figuras || []).forEach((f) => { m.set(`fig:${f.ordem}:titulo`, f.titulo); m.set(`fig:${f.ordem}:legenda`, f.legenda); });
  if (secoes.ok) secoes.lista.forEach((s, i) => m.set(`secao:${i}`, s.texto));
  return m;
}

// Seções esperadas, calculadas aqui a partir do JSON e não do painel, para
// que um erro na separação feita pelo painel também seja apanhado.
const CHAVES = { padrao: ['introducao', 'objetivos', 'metodos', 'resultados'], relato: ['introducao', 'metodos', 'resultados', 'conclusao'] };
function secoesEsperadas(t) {
  const chaves = Number(t.fase) === 7 || !/relato de caso/i.test(t.desenho || '') ? CHAVES.padrao : CHAVES.relato;
  if (chaves.some((k) => t[k] != null)) return { ok: true, lista: chaves.map((k) => ({ texto: t[k] || '' })) };
  const partes = (t.resumo || '').split('\n\n');
  return partes.length === chaves.length ? { ok: true, lista: partes.map((texto) => ({ texto })) } : { ok: false, lista: [] };
}

// Sequências de 8+ palavras que reaparecem adiante no texto. Repetição curta
// costuma ser intencional (o objetivo retomado nos resultados); 25+ palavras
// seguidas sugere parágrafo colado duas vezes.
function repetidos(texto, n = 8) {
  const w = texto.split(/\s+/).filter(Boolean), norm = w.map((x) => x.toLowerCase());
  const primeira = new Map(), achados = [];
  for (let i = 0; i + n <= w.length; i++) {
    const k = norm.slice(i, i + n).join(' ');
    const j = primeira.get(k);
    if (j == null) { primeira.set(k, i); continue; }
    if (i - j < n) continue;
    let fim = i + n;
    while (fim < w.length && norm[fim] === norm[j + fim - i]) fim++;
    achados.push({ palavras: fim - i, inicio: w.slice(i, i + 8).join(' ') });
    i = fim - 1;
  }
  return achados;
}

const coleta = () => [...document.querySelectorAll('#palco [data-campo]')].map((n) => [n.dataset.campo, n.textContent]);
const relatorio = [];
let reprovados = 0;

await pagina.goto(base);
await pagina.waitForSelector('html[data-pronto]');
if (capturas) await pagina.screenshot({ path: path.join(capturas, '00-galeria.png') });

for (const [i, t] of posters.entries()) {
  const r = { id: t.id, titulo: t.titulo, erros: [], sinais: [] };
  const secoes = secoesEsperadas(t);
  const exp = esperado(t, secoes);
  const confere = (tela, pares) => {
    for (const [campo, texto] of pares) {
      if (!exp.has(campo)) r.erros.push(`${tela}: campo desconhecido ${campo}`);
      else if (exp.get(campo) !== texto) r.erros.push(`${tela}: ${campo} difere do submetido`);
    }
  };

  // vitrine
  await pagina.evaluate((id) => { location.hash = `#/p/${id}`; }, t.id);
  await pagina.waitForSelector('[data-vitrine]');
  await pagina.waitForTimeout(150);
  confere('vitrine', await pagina.evaluate(coleta));
  const rolaVitrine = await pagina.evaluate(() => { const v = document.querySelector('[data-vitrine]'); return v.scrollHeight - v.clientHeight; });
  if (rolaVitrine > 2) r.sinais.push(`vitrine precisa rolar ${rolaVitrine}px para mostrar tudo`);
  if (capturas) await pagina.screenshot({ path: path.join(capturas, `${String(i + 1).padStart(2, '0')}-${t.id}-vitrine.png`) });

  // leitura
  await pagina.evaluate((id) => { location.hash = `#/p/${id}/ler`; }, t.id);
  await pagina.waitForSelector('.leitura');
  await pagina.evaluate(async () => {
    const imgs = [...document.querySelectorAll('.leitura img')];
    imgs.forEach((im) => { im.loading = 'eager'; });
    await Promise.all(imgs.map((im) => im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; })));
  });
  const pares = await pagina.evaluate(coleta);
  confere('leitura', pares);
  const naLeitura = new Map(pares);
  const completo = secoes.ok ? secoes.lista.map((_, k) => naLeitura.get(`secao:${k}`)).join('\n\n') : naLeitura.get('resumo');
  const original = secoes.ok ? secoes.lista.map((s) => s.texto).join('\n\n') : t.resumo;
  if (completo !== original) r.erros.push('leitura: o texto completo não aparece inteiro e idêntico');
  for (const [campo, valor] of exp) {
    if (valor && campo !== 'autor' && !naLeitura.has(campo) && !(campo === 'resumo' && secoes.ok) && !(campo.startsWith('secao:') && !secoes.ok))
      r.erros.push(`leitura: ${campo} não aparece`);
  }

  if (!secoes.ok) r.sinais.push(`seções não separáveis automaticamente (${(t.resumo || '').split('\n\n').length} blocos para 4 seções) — texto exibido inteiro`);
  const figs = await pagina.evaluate(() => [...document.querySelectorAll('.leitura figure img')].map((im) => ({ src: im.getAttribute('src'), nat: im.naturalWidth, tela: im.getBoundingClientRect().width })));
  for (const f of figs) {
    if (!f.nat) r.sinais.push(`figura não carregou: ${f.src}`);
    else if (f.nat < f.tela) r.sinais.push(`figura em baixa resolução: ${f.nat}px de largura, ampliada para ${Math.round(f.tela)}px na tela`);
  }
  const abaixo4k = figs.filter((f) => f.nat >= f.tela && f.nat < f.tela * 2).length;
  if (abaixo4k) r.notas = `${abaixo4k} de ${figs.length} figura(s) abaixo da nitidez 4K nativa (legíveis; não sinalizado)`;
  const rep = repetidos(original || '');
  const longos = rep.filter((x) => x.palavras >= 25);
  if (longos.length) r.sinais.push(`possível parágrafo duplicado: ${longos.length} trecho(s) de 25+ palavras aparecem duas vezes, ex.: "${longos[0].inicio}…" (${longos[0].palavras} palavras) — conferir com o aluno`);
  else if (rep.length) r.sinais.push(`repetição curta (${rep.map((x) => x.palavras).join(', ')} palavras), provavelmente intencional: "${rep[0].inicio}…"`);
  if (capturas && i < 3) await pagina.screenshot({ path: path.join(capturas, `${String(i + 1).padStart(2, '0')}-${t.id}-leitura.png`) });

  if (r.erros.length) reprovados++;
  relatorio.push(r);
}

await navegador.close();
servidor.close();

console.log(`# Verificação do painel touch — ${posters.length} pôsteres (${arqDados})\n`);
console.log(`Integridade do texto: ${posters.length - reprovados} aprovados, ${reprovados} reprovados.\n`);
for (const r of relatorio) {
  if (!r.erros.length && !r.sinais.length && !r.notas) continue;
  console.log(`## ${r.id} — ${r.titulo}`);
  r.erros.forEach((e) => console.log(`- ❌ ${e}`));
  r.sinais.forEach((s) => console.log(`- ⚠️ ${s}`));
  if (r.notas) console.log(`- ℹ️ ${r.notas}`);
  console.log('');
}
const limpos = relatorio.filter((r) => !r.erros.length && !r.sinais.length).length;
console.log(`Sem nenhuma sinalização: ${limpos} de ${posters.length}.`);
process.exit(reprovados ? 1 : 0);
