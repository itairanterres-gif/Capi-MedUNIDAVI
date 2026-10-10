import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createShell } from '../server.mjs';

async function fixture() {
  const dir = await realpath(await mkdtemp(path.join(tmpdir(), 'sam-')));
  const files = {
    'index.html': '<!doctype html><title>SAM</title>', 'lib.js': 'const x = 1;', 'lib.jsx': 'const x = <b/>;', 'sam-config.js': 'window.SAM_CONFIG = null;',
    'xi_sam.json': '{"edicao":{}}', 'painel-touch/index.html': '<!doctype html>', 'painel-touch/painel.js': '//', 'painel-touch/verificar.mjs': '//', 'painel-touch/para-a-frente-principal/revisao.js': '//', 'vendor/supabase.js': '//', 'assets/xi/a.png': 'png',
    'supabase/proposta/schema.sql': 'secret plan', 'dados-origem/contas.json': '{"senha":"x"}',
    '.git/config': '[core]', '_test/x.html': 'x', 'docs/plano.md': '#',
  };
  for (const [name, body] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), body);
  }
  return dir;
}

test('SAM is served under /sam/ with Capi Supabase config and nothing private', async () => {
  const samDir = await fixture();
  const integration = { url: 'http://127.0.0.1:28478', key: 'sb_publishable_fixture', storageKey: 'sb-capi-local-auth-token', samDir, samEdicao: 'xii' };
  const server = createShell({ integration });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const redirect = await fetch(base + '/sam', { redirect: 'manual' });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), '/sam/');
    for (const ok of ['/sam/', '/sam/lib.js', '/sam/xi_sam.json', '/sam/vendor/supabase.js', '/sam/assets/xi/a.png', '/sam/painel-touch/', '/sam/painel-touch/painel.js'])
      assert.equal((await fetch(base + ok)).status, 200, ok);
    for (const bad of ['/sam/supabase/proposta/schema.sql', '/sam/dados-origem/contas.json', '/sam/.git/config', '/sam/_test/x.html',
      '/sam/docs/plano.md', '/sam/painel-touch/verificar.mjs', '/sam/painel-touch/para-a-frente-principal/revisao.js', '/sam/lib.jsx', '/sam/%2e%2e/server.mjs', '/sam/..%2fserver.mjs', '/sam/vendor/../dados-origem/contas.json'])
      assert.equal((await fetch(base + bad)).status, 404, bad);
    const config = await (await fetch(base + '/sam/sam-config.js')).text();
    assert.match(config, /"backend":"supabase"/);
    assert.match(config, /"storageKey":"sb-capi-local-auth-token"/);
    assert.match(config, /"edicao":"xii"/);
    assert.ok(!config.includes('sb_secret_') && !config.includes('service_role'));
    const csp = (await fetch(base + '/sam/')).headers.get('content-security-policy');
    assert.match(csp, /connect-src 'self' http:\/\/127\.0\.0\.1:28478/);
    assert.match(csp, /frame-ancestors 'none'/);
    // Pré-compilado: sem inline, eval ou CDN de scripts.
    assert.match(csp, /script-src 'self';/);
    assert.ok(!/unsafe-eval|unpkg|jsdelivr/.test(csp));
    // Without a SAM mount, /sam/ does not exist.
    const plain = createShell({});
    await new Promise(resolve => plain.listen(0, '127.0.0.1', resolve));
    try { assert.equal((await fetch('http://127.0.0.1:' + plain.address().port + '/sam/')).status, 404); }
    finally { await new Promise(resolve => plain.close(resolve)); }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(samDir, { recursive: true, force: true });
  }
});
