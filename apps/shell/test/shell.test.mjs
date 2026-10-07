import test from 'node:test';
import assert from 'node:assert/strict';
import { createShell } from '../server.mjs';
import { sessionModule } from '../navigation.mjs';
import { content, renderAbout } from '../../../packages/public-about/index.mjs';

async function withShell(options, action) {
  const server = createShell(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await action('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const article = html => html.match(/<article>([\s\S]*?)<\/article>/)[1];

test('shell owns navigation while rendering exactly the approved About article', async () => {
  await withShell({}, async base => {
    const home = await (await fetch(base)).text();
    assert.ok(home.includes(content.home.tagline));
    assert.ok(home.includes('href="/" aria-current="page"'));
    assert.ok(home.includes('href="' + sessionModule.url + '" rel="noreferrer"'));
    assert.ok(!home.includes('Conta de teste'));
    for (const role of Object.keys(content.roles)) {
      const response = await fetch(base + '/sobre?papel=' + role);
      const html = await response.text();
      assert.equal(article(html), article(renderAbout(role)));
      assert.ok(html.includes('href="/sobre" aria-current="page"'));
      assert.ok(!html.includes('canon-catalogue'));
      assert.ok(!html.includes('Treino-enamed/blob'));
      assert.match(response.headers.get('content-security-policy'), /script-src 'none'/);
      assert.equal(response.headers.get('set-cookie'), null);
    }
    assert.equal((await fetch(base + '/capi-portrait.webp')).headers.get('content-type'), 'image/webp');
  });
});

test('editorial input never creates identity, exposes archives, or forwards context to modules', async () => {
  await withShell({}, async base => {
    const home = await (await fetch(base + '/?token=secret&papel=coordenacao')).text();
    assert.ok(!home.includes('secret'));
    assert.ok(home.includes('href="' + sessionModule.url + '"'));
    for (const path of ['/api/me', '/api/login', '/docs/product/canon-catalogue.json', '/contracts/ai/heritage/CANON_MEDICUM_V0_1.json', '/public/ASSETS.md', '/missing']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    assert.equal((await fetch(base + '/sobre', { method: 'POST' })).status, 405);
    for (const role of ['admin', '__proto__', '<script>']) {
      const html = await (await fetch(base + '/sobre?papel=' + encodeURIComponent(role))).text();
      assert.equal(article(html), article(renderAbout(null)));
    }
    assert.equal(await (await fetch(base + '/', { method: 'HEAD' })).text(), '');
  });
});

test('host audience is optional and failure cannot block public About', async () => {
  await withShell({ resolveAudience: async () => 'docente' }, async base => {
    assert.equal(article(await (await fetch(base + '/sobre')).text()), article(renderAbout('docente')));
    assert.equal(article(await (await fetch(base + '/sobre?papel=estudante')).text()), article(renderAbout('estudante')));
  });
  await withShell({ resolveAudience: async () => { throw Error('unavailable'); } }, async base => {
    const response = await fetch(base + '/sobre');
    assert.equal(response.status, 200);
    assert.equal(article(await response.text()), article(renderAbout(null)));
  });
});
