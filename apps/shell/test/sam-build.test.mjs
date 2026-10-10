import test from 'node:test';
import assert from 'node:assert/strict';
import { transformarPagina } from '../../sam/build.mjs';

const pagina = `<html><head>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-x" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
</head><body><script src="data.js"></script><script>window.X = 1;</script>
<script type="text/babel" src="lib.jsx"></script>
<script type="text/babel" data-presets="react">ReactDOM.createRoot(r).render(<App />);</script></body></html>`;

test('SAM pages lose Babel, CDN and inline scripts; JSX becomes deferred files in order', async () => {
  const { html, extras } = await transformarPagina('index', pagina, async code => code.replace('<App />', 'React.createElement(App)'));
  assert.ok(!/unpkg|jsdelivr|accounts\.google|text\/babel|integrity/.test(html));
  assert.ok(!/<script>[^<]/.test(html), 'no inline script');
  const srcs = [...html.matchAll(/<script([^>]*)src="([^"]+)"/g)].map(m => (m[1].includes('defer') ? 'defer ' : '') + m[2]);
  assert.deepEqual(srcs, ['vendor/react-18.3.1.production.min.js', 'defer vendor/katex-0.16.11/katex.min.js', 'data.js',
    'index.inline-1.js', 'defer lib.js', 'defer index.app-2.js']);
  assert.match(html, /href="vendor\/katex-0\.16\.11\/katex\.min\.css"/);
  assert.deepEqual(extras.map(e => e[0]), ['index.inline-1.js', 'index.app-2.js']);
  assert.match(extras[1][1], /React\.createElement\(App\)/);
});

test('unknown external scripts and path tricks stop the SAM build', async () => {
  await assert.rejects(transformarPagina('x', '<script src="https://evil.test/a.js"></script>'), /externo/);
  await assert.rejects(transformarPagina('x', '<script src="//evil.test/a.js"></script>'), /externo/);
  await assert.rejects(transformarPagina('x', '<script src="../server.mjs"></script>'), /inválido/);
});
