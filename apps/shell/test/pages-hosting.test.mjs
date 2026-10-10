import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHostedOrigin } from '../config-contract.mjs';
import { pagesHeaders, pagesRedirects } from '../pages-hosting.mjs';
import { canonicalURL } from '../auth-contract.mjs';
import { buildHosted } from '../build-hosted.mjs';

const env = value => ({ CAPI_PUBLIC_ORIGIN: value, CAPI_APPROVED_PUBLIC_ORIGIN: value });
test('publication mode refuses placeholder origins, fixture credentials and unknown targets before writing output', async () => {
  const base = { ...env('https://approved-host.unidavi.edu.br'), CAPI_AMRIGS_HOSTED: '1' };
  await assert.rejects(buildHosted({ ...base, CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }), /production build blocked/);
  await assert.rejects(buildHosted({ ...base, CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic' }), /production build blocked/);
  await assert.rejects(buildHosted({ ...base, CAPI_HOSTING_TARGET: 'unknown' }), /production build blocked/);
});
test('future origin is explicit HTTPS, not tied to the superseded Vercel origin', () => {
  assert.equal(validateHostedOrigin(env('https://approved-host.unidavi.edu.br')), 'https://approved-host.unidavi.edu.br');
  for (const value of ['', 'http://approved-host.unidavi.edu.br', 'https://host.invalid',
    'https://host.unidavi.edu.br/', 'https://host.unidavi.edu.br/path',
    'https://host.unidavi.edu.br?query=1', 'https://host.unidavi.edu.br#token',
    'https://user:password@host.unidavi.edu.br', 'https://host.unidavi.edu.br:443',
    'https://host.unidavi.edu.br:8443', 'https://127.0.0.1', 'https://localhost',
    'https://host.local', 'https://host.test', 'https://*.pages.dev', 'https://host.unidavi.edu.br\n'])
    assert.throws(() => validateHostedOrigin(env(value)), value);
  assert.throws(() => validateHostedOrigin({ ...env('https://host.unidavi.edu.br'), CAPI_APPROVED_PUBLIC_ORIGIN: 'https://different.unidavi.edu.br' }));
  assert.equal(validateHostedOrigin({ ...env('https://capi-preparacao.invalid'), CAPI_LOCAL_PREPARATION: '1' }), 'https://capi-preparacao.invalid');
});
test('Pages limits CSP to existing Supabase and removes default cross-origin asset access', () => {
  const headers = pagesHeaders(canonicalURL);
  assert.ok(headers.includes(`connect-src 'self' ${canonicalURL} ${canonicalURL.replace('https:', 'wss:')}`));
  assert.ok(headers.includes('! Access-Control-Allow-Origin'));
  assert.ok(headers.includes('Cache-Control: no-store'));
  assert.ok(headers.includes("frame-ancestors 'none'"));
  assert.throws(() => pagesHeaders('https://other.supabase.co'));
  assert.ok(headers.split('\n').every(line => line.length <= 2000));
});
test('HashRouter entry redirects cannot swallow assets or expose ENAMED paths', () => {
  const rules = pagesRedirects.split('\n').filter(line => line && !line.startsWith('#'));
  assert.equal(rules.length, 4);
  assert.ok(rules.every(line => !line.includes('*') && !line.includes('http') && !line.includes('enamed')));
  assert.ok(rules.includes('/questoes /questoes/ 302'));
  assert.ok(rules.includes('/amrigs /amrigs/ 302'));
});
test('no Capi page may be framed, SAM included (the horizontal TV preview was removed)', async () => {
  const { samPagesHeaders, samCSP } = await import('../pages-hosting.mjs');
  assert.ok(!samPagesHeaders(canonicalURL).includes('X-Frame-Options'));
  assert.ok(samCSP(canonicalURL).includes("frame-ancestors 'none'"));
  assert.ok(pagesHeaders(canonicalURL).includes('X-Frame-Options: DENY'));
});
