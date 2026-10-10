// Recorte automático da parte VISUAL de uma figura de prova (sem enunciado nem
// alternativas, que o Capi já mostra em texto).
//   node tools/figuras/recortar.mjs <entrada.png> <saida.png>
// Lê a imagem em tons de cinza pelo ffmpeg, acha as faixas horizontais com
// tinta, junta as faixas altas (figura) e as vizinhas próximas (rótulos A)–D),
// legenda), corta as margens brancas e grava pelo ffmpeg. Imprime o recorte.
import { execFileSync } from 'node:child_process';

const [entrada, saida, modo] = process.argv.slice(2);
const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', entrada])
  .toString().trim().split(',').map(Number);
const px = execFileSync('ffmpeg', ['-v', 'error', '-i', entrada, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 });

// Tons claros contam (raio-X, fundos coloridos de curvas); só o branco do papel não.
const escuroPx = (x, y) => px[y * w + x] < 235;
// Colunas de moldura (escuras em quase toda a altura) não contam como tinta.
const moldura = new Set();
for (let x = 0; x < w; x++) { let n = 0; for (let y = 0; y < h; y++) if (escuroPx(x, y)) n++; if (n > h * 0.6) moldura.add(x); }
const escuro = (x, y) => !moldura.has(x) && escuroPx(x, y);
const tintaLinha = y => { let n = 0; for (let x = 0; x < w; x++) if (escuro(x, y)) n++; return n; };
const linhas = Array.from({ length: h }, (_, y) => tintaLinha(y) > 2);
const faixas = [];
for (let y = 0; y < h; y++) {
  if (!linhas[y]) continue;
  const ultima = faixas[faixas.length - 1];
  if (ultima && y - ultima.fim <= 2) ultima.fim = y; else faixas.push({ ini: y, fim: y });
}
for (const f of faixas) {
  f.alt = f.fim - f.ini + 1;
  let a = w, b = 0;
  for (let y = f.ini; y <= f.fim; y++) for (let x = 0; x < w; x++) if (escuro(x, y)) { if (x < a) a = x; if (x > b) b = x; }
  f.x0 = a; f.x1 = b;
}
// Rótulo/legenda: curto e não colado na margem esquerda do texto ("Figura 2",
// "Fonte: …", "a b"). Linha de enunciado ou alternativa começa na margem.
const margem = Math.min(...faixas.map(f => f.x0));
const rotulo = f => f.alt < ALTA && (f.x1 - f.x0) < w * 0.55 && f.x0 > margem + 25;
// Linha de texto do corpo da prova: até ~22 px. Figura: faixa bem mais alta.
var ALTA = 34;
if (saida === 'faixas') { console.log(faixas.map(f => `${f.ini}-${f.fim}:${f.x0}-${f.x1}`).join(' ')); process.exit(0); }
if (modo) {
  const [y0, y1] = modo.split(':').map(Number);
  let a = w, b = 0;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (escuro(x, y)) { if (x < a) a = x; if (x > b) b = x; }
  const cx = Math.max(0, a - 12), cw = Math.min(w, b + 13) - cx;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada, '-vf', `crop=${cw}:${y1 - y0 + 1}:${cx}:${y0}`, saida]);
  console.log(JSON.stringify({ entrada: entrada.split(/[\/]/).pop(), recorte: [cx, y0, cw, y1 - y0 + 1] })); process.exit(0);
}
const altas = faixas.map((f, i) => ({ ...f, i })).filter(f => f.alt >= ALTA);
if (!altas.length) { console.log('sem figura detectável; nada feito'); process.exit(2); }
// Aglomerados de faixas altas (painéis da mesma figura ficam a até 90 px).
const clusters = [];
for (const f of altas) { const c = clusters[clusters.length - 1]; if (c && f.ini - c.fim <= 90) { c.fim = f.fim; c.ultimo = f.i; c.soma += f.alt; } else clusters.push({ ini: f.ini, fim: f.fim, primeiro: f.i, ultimo: f.i, soma: f.alt }); }
const bloco = clusters.sort((a, b) => b.soma - a.soma)[0];
// Rótulos colados acima (até 14 px; ex.: "a b", "A)") e legenda logo abaixo
// (até 2 linhas curtas, a até 22 px; ex.: "Figura 2", "Fonte: ...").
for (let k = bloco.primeiro - 1; k >= 0 && bloco.ini - faixas[k].fim <= 30 && rotulo(faixas[k]); k--) bloco.ini = faixas[k].ini;
for (let k = bloco.ultimo + 1, n = 0; k < faixas.length && n < 2 && faixas[k].ini - bloco.fim <= 22 && rotulo(faixas[k]); k++, n++) bloco.fim = faixas[k].fim;
// Margens horizontais.
let x0 = w, x1 = 0;
for (let y = bloco.ini; y <= bloco.fim; y++) for (let x = 0; x < w; x++) if (escuro(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
const M = 12;
const cx = Math.max(0, x0 - M), cy = Math.max(0, bloco.ini - M);
const cw = Math.min(w, x1 + M + 1) - cx, ch = Math.min(h, bloco.fim + M + 1) - cy;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada, '-vf', `crop=${cw}:${ch}:${cx}:${cy}`, saida]);
console.log(JSON.stringify({ entrada: entrada.split(/[\\/]/).pop(), de: [w, h], recorte: [cx, cy, cw, ch] }));
