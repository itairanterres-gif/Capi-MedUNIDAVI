// Pré-compila o SAM (Semana Acadêmica) para ser servido em /sam/ no Capi.
//   node apps/sam/build.mjs   →   apps/sam/dist/
// O site original compila JSX no navegador (Babel standalone) e carrega React,
// KaTeX e QR de CDN. Aqui o JSX vira JS antes da publicação e as bibliotecas
// vêm de vendor/, para que o /sam/ siga a mesma CSP estrita do Capi
// (script-src 'self', sem scripts inline e sem eval).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(new URL('../shell/package.json', import.meta.url));
const esbuild = require('esbuild');

const site = fileURLToPath(new URL('./site/', import.meta.url));
const saida = fileURLToPath(new URL('./dist/', import.meta.url));

// Páginas publicadas. Ferramentas internas (painéis de LED, prévias, bateria
// de validação, demonstrações) ficam fora do Capi.
export const paginas = ['index', 'edicao', 'submissao', 'curadoria', 'telao', 'material', 'previa-tv'];

// Trocas de CDN por cópias locais (mesmas versões fixadas no site original).
const cdn = new Map([
  ['https://unpkg.com/react@18.3.1/umd/react.development.js', 'vendor/react-18.3.1.production.min.js'],
  ['https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js', 'vendor/react-dom-18.3.1.production.min.js'],
  ['https://unpkg.com/qrcode-generator@1.4.4/qrcode.js', 'vendor/qrcode-generator-1.4.4.js'],
  ['https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js', 'vendor/katex-0.16.11/katex.min.js'],
]);
// Removidos: o Babel deixa de ser necessário e o login do SAM é o do Capi.
const removidos = new Set(['https://unpkg.com/@babel/standalone@7.29.0/babel.min.js', 'https://accounts.google.com/gsi/client']);
const katexCSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

const jsx = code => esbuild.transform(code, {
  loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  target: 'es2020', charset: 'utf8', legalComments: 'inline',
}).then(r => r.code);

function atributos(texto) {
  const a = {};
  for (const m of texto.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) a[m[1]] = m[2] ?? '';
  return a;
}

// previa-tv.html escreve seus scripts com document.write (e ?v= para furar cache).
// No pacote vira lista estática; o cache já é no-store em todo o Capi.
const carregadorPrevia = /<script>\s*\(function \(\) \{\s*var m = location\.search[\s\S]*?\}\)\(\);\s*<\/script>/;
const estaticoPrevia = [
  '<script src="data.js"></script>',
  '<script src="esquema.js"></script>',
  '<script src="ajuste.js"></script>',
  '<script type="text/babel" src="lib.jsx"></script>',
  '<script type="text/babel" src="posters.jsx"></script>',
].join('\n  ');

export async function transformarPagina(nome, html, compilar = jsx) {
  if (nome === 'previa-tv') {
    if (!carregadorPrevia.test(html)) throw new Error('Carregador da prévia mudou; ajuste build.mjs');
    html = html.replace(carregadorPrevia, estaticoPrevia);
  }
  const extras = [];
  let n = 0;
  const trocar = async (_tag, attrs, corpo) => {
    const a = atributos(attrs);
    const babel = a.type === 'text/babel';
    if (a.src) {
      if (removidos.has(a.src)) return '';
      if (cdn.has(a.src)) return `<script${'defer' in a ? ' defer' : ''} src="${cdn.get(a.src)}"></script>`;
      if (/^[a-z]+:|^\/\//i.test(a.src)) throw new Error(`Script externo não previsto em ${nome}.html: ${a.src}`);
      if (!/^[\w./-]+$/.test(a.src) || a.src.includes('..')) throw new Error(`Script inválido em ${nome}.html: ${a.src}`);
      if (babel) {
        if (!a.src.endsWith('.jsx')) throw new Error(`Babel sem .jsx em ${nome}.html`);
        return `<script defer src="${a.src.replace(/\.jsx$/, '.js')}"></script>`;
      }
      return `<script src="${a.src}"></script>`;
    }
    // Scripts inline viram arquivos: a CSP do Capi não permite inline.
    const arquivo = `${nome}.${babel ? 'app' : 'inline'}-${++n}.js`;
    extras.push([arquivo, babel ? await compilar(corpo) : corpo.trim() + '\n']);
    return `<script${babel ? ' defer' : ''} src="${arquivo}"></script>`;
  };
  let resultado = '';
  let ultimo = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    resultado += html.slice(ultimo, m.index) + await trocar(...m);
    ultimo = m.index + m[0].length;
  }
  resultado += html.slice(ultimo);
  resultado = resultado
    .replace(/<link\b[^>]*href="https:\/\/cdn\.jsdelivr\.net\/npm\/katex@0\.16\.11\/dist\/katex\.min\.css"[^>]*>/,
      '<link rel="stylesheet" href="vendor/katex-0.16.11/katex.min.css" />')
    .replace(/^\s*<!--[^\n]*Babel[^\n]*-->\n/gm, '');
  if (resultado.includes(katexCSS) || /text\/babel/.test(resultado)) throw new Error(`Restos de CDN/Babel em ${nome}.html`);
  return { html: resultado, extras };
}

// Arquivos do site que não vão para o Capi.
function fica(rel) {
  const base = path.posix.basename(rel);
  if (rel.split('/').some(p => p.startsWith('.') || p.startsWith('_'))) return false;
  if (base.endsWith('.html')) return !rel.includes('/') && paginas.includes(base.slice(0, -5));
  if (base.endsWith('.jsx')) return false;
  // sam-config.js é escrito pelo Capi (backend Supabase); demais ferramentas internas ficam fora.
  return !['sam-config.js', 'paineis.js', 'material-demo-quiz.js'].includes(rel);
}

async function listar(dir, rel = '') {
  const itens = [];
  for (const e of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) itens.push(...await listar(dir, r)); else itens.push(r);
  }
  return itens;
}

export async function buildSam() {
  await rm(saida, { recursive: true, force: true });
  await mkdir(saida, { recursive: true });
  for (const rel of await listar(site)) {
    if (!fica(rel) || rel.endsWith('.html')) continue;
    await mkdir(path.join(saida, path.dirname(rel)), { recursive: true });
    await cp(path.join(site, rel), path.join(saida, rel));
  }
  const jsxs = (await readdir(site)).filter(f => f.endsWith('.jsx'));
  for (const f of jsxs) await writeFile(path.join(saida, f.replace(/\.jsx$/, '.js')), await jsx(await readFile(path.join(site, f), 'utf8')));
  for (const nome of paginas) {
    const { html, extras } = await transformarPagina(nome, await readFile(path.join(site, nome + '.html'), 'utf8'));
    await writeFile(path.join(saida, nome + '.html'), html);
    for (const [arquivo, codigo] of extras) await writeFile(path.join(saida, arquivo), codigo);
    // Todo script referenciado precisa existir no pacote (sam-config.js vem do Capi).
    for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g))
      if (m[1] !== 'sam-config.js') await readFile(path.join(saida, m[1])).catch(() => { throw new Error(`${nome}.html referencia ${m[1]}, ausente no pacote`); });
  }
  return saida;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await buildSam());
