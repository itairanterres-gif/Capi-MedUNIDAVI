import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { canonicalURL, storageKey, resolveIdentity } from '../auth-contract.mjs';

// Real SDK and session storage, synthetic in-process Auth/PostgREST transport.
// This does not claim hosted Supabase or RLS validation.
function fixture(role) {
  const storage = new Map();
  let revoked = false, refreshes = 0, logins = 0;
  const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'synthetic@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { role: 'admin' }, created_at: new Date().toISOString() };
  const jwt = () => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url'), 'synthetic-signature'].join('.');
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const transport = async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.origin, canonicalURL);
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') refreshes++; else logins++;
      if (revoked) return response({ code: 'refresh_token_not_found', message: 'revoked' }, 400);
      return response({ access_token: jwt(), refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user });
    }
    if (url.pathname === '/auth/v1/logout') { revoked = true; return response({}); }
    if (url.pathname === '/auth/v1/user') return revoked ? response({ message: 'revoked', code: 'session_not_found' }, 403) : response(user);
    if (url.pathname === '/rest/v1/profiles') {
      assert.equal(url.searchParams.get('id'), 'eq.' + user.id);
      assert.ok(new Headers(options.headers).get('authorization')?.startsWith('Bearer '));
      return revoked ? response({ message: 'denied' }, 401) : response({ id: user.id, nome: 'Conta sintética', role, senha_definida: true });
    }
    throw Error('Unexpected request: ' + url.pathname);
  };
  const client = () => createClient(canonicalURL, 'sb_publishable_synthetic', { global: { fetch: transport }, auth: { storageKey, flowType: 'pkce', autoRefreshToken: false, detectSessionInUrl: false, persistSession: true, storage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) } } });
  return { client, storage, revoke: () => { revoked = true; }, counts: () => ({ refreshes, logins }) };
}
for (const role of ['aluno', 'professor', 'admin']) test(`one login, same subject and unchanged ${role} role across shell/module; logout clears shared session`, async () => {
  const f = fixture(role);
  const shell = f.client();
  const result = await shell.auth.signInWithPassword({ email: 'synthetic@example.invalid', password: 'synthetic-only' });
  assert.equal(result.error, null);
  const before = await resolveIdentity(shell);
  const module = f.client();
  assert.deepEqual(await resolveIdentity(module), before);
  assert.equal(before.role, role);
  assert.equal(f.counts().logins, 1);
  const { error } = await module.auth.signOut({ scope: 'local' });
  assert.equal(error, null);
  assert.equal(await resolveIdentity(shell), null);
  assert.equal(await resolveIdentity(f.client()), null);
});
test('expiry refreshes using the shared session; remote revocation blocks a previously cached user', async () => {
  const f = fixture('aluno');
  const shell = f.client();
  await shell.auth.signInWithPassword({ email: 'synthetic@example.invalid', password: 'synthetic-only' });
  const saved = JSON.parse(f.storage.get(storageKey));
  saved.expires_at = 1;
  f.storage.set(storageKey, JSON.stringify(saved));
  const module = f.client();
  assert.equal((await resolveIdentity(module)).role, 'aluno');
  assert.equal(f.counts().refreshes, 1);
  assert.equal(f.counts().logins, 1);
  f.revoke();
  await assert.rejects(resolveIdentity(module));
});
