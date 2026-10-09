import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalURL, storageKey, resolveIdentity } from '../auth-contract.mjs';
import { loadIntegration, moduleAsset } from '../integration.mjs';
import { createShell } from '../server.mjs';

function client({ session = {}, user = { id: 'synthetic-subject', user_metadata: { role: 'admin' } }, profile = { id: 'synthetic-subject', nome: '<b>Teste</b>', role: 'aluno' }, userError = null, profileError = null } = {}) {
  return { auth: { getSession: async () => ({ data: { session } }), getUser: async () => ({ data: { user }, error: userError }) }, from(table) {
    assert.equal(table, 'profiles');
    return { select() { return this; }, eq(column, id) { assert.equal(column, 'id'); assert.equal(id, user.id); return this; }, single: async () => ({ data: profile, error: profileError }) };
  } };
}
test('roles come only from verified user and own profile; admin is not coordination', async () => {
  assert.equal(await resolveIdentity(client({ session: null })), null);
  for (const [role, perspective] of [['aluno', 'estudante'], ['professor', 'docente'], ['admin', null]]) {
    const actual = await resolveIdentity(client({ profile: { id: 'synthetic-subject', role } }));
    assert.equal(actual.role, role); assert.equal(actual.perspective, perspective);
  }
  await assert.rejects(resolveIdentity(client({ userError: Error('expired') })));
  await assert.rejects(resolveIdentity(client({ profile: null })));
  await assert.rejects(resolveIdentity(client({ profileError: Error('network') })));
  await assert.rejects(resolveIdentity(client({ profile: { id: 'other-person', role: 'admin' } })));
  await assert.rejects(resolveIdentity(client({ profile: { id: 'synthetic-subject', role: '__proto__' } })));
});
test('integration requires explicit matching build, refuses demo and private keys', async () => {
  assert.equal(await loadIntegration({}), null);
  const root = await mkdtemp(path.join(os.tmpdir(), 'capi-auth-'));
  try {
    const env = { CAPI_SHARED_LOGIN: '1', CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', CAPI_QUESTOES_DIST: root };
    const manifest = { version: 1, base: '/questoes/', mode: 'supabase', project: canonicalURL, storageKey };
    await writeFile(path.join(root, 'capi-integration.json'), JSON.stringify(manifest));
    assert.equal((await loadIntegration(env)).url, canonicalURL);
    await assert.rejects(loadIntegration({ ...env, CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden' }));
    for (const changes of [{ mode: 'demo' }, { project: 'https://other.supabase.co' }, { base: '/' }, { storageKey: 'other' }]) {
      await writeFile(path.join(root, 'capi-integration.json'), JSON.stringify({ ...manifest, ...changes }));
      await assert.rejects(loadIntegration(env));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('local homologation accepts only loopback Auth and keeps Google disabled', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'capi-local-auth-'));
  const localURL = 'http://127.0.0.1:24567';
  const env = { CAPI_SHARED_LOGIN: '1', CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', CAPI_QUESTOES_DIST: root,
    CAPI_LOCAL_SUPABASE_URL: localURL, CAPI_GOOGLE_ENABLED: '1' };
  try {
    await writeFile(path.join(root, 'capi-integration.json'), JSON.stringify({ version: 1, base: '/questoes/', mode: 'supabase',
      project: localURL, storageKey: 'sb-capi-local-auth-token' }));
    const actual = await loadIntegration(env);
    assert.equal(actual.url, localURL);
    assert.equal(actual.googleEnabled, false);
    await assert.rejects(loadIntegration({ ...env, CAPI_LOCAL_SUPABASE_URL: 'https://other.supabase.co' }));
    await assert.rejects(loadIntegration({ ...env, CAPI_LOCAL_SUPABASE_URL: 'http://localhost:24567' }));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('integrated host serves module build only; no tokens, archives, traversal or writes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'capi-build-'));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<h1>Synthetic module build</h1>');
  await writeFile(path.join(root, 'assets', 'app.js'), '/* build */');
  await writeFile(path.join(root, '.env'), 'DO_NOT_SERVE');
  const server = createShell({ integration: { root, url: canonicalURL, key: 'sb_publishable_test', storageKey } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.match(await (await fetch(base)).text(), /href="\/entrar"/);
    const login = await fetch(base + '/entrar?token=never-echo&next=https://evil.invalid');
    const html = await login.text();
    assert.ok(!html.includes('never-echo')); assert.ok(!html.includes('evil.invalid'));
    assert.match(html, /href="\/questoes\/"/);
    assert.equal(login.headers.get('cache-control'), 'no-store');
    assert.match(login.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal((await fetch(base + '/questoes/', { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/questoes/')).status, 200);
    for (const pathname of ['/questoes/.env', '/questoes/capi-integration.json', '/questoes/assets/a.map', '/questoes/assets/%2e%2e%2f.env', '/questoes/assets/%5c..%5c.env']) assert.equal(await moduleAsset(root, pathname), null);
    assert.equal((await fetch(base + '/questoes/assets/app.js')).status, 200);
    assert.equal((await fetch(base + '/questoes/capi-integration.json')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
});
