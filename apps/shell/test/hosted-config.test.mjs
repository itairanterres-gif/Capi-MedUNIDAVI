import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonicalURL, storageKey } from '../auth-contract.mjs';
import { validateAuthConfig } from '../config-contract.mjs';
import { loadIntegration } from '../integration.mjs';
import { renderHome, renderAmrigsPilot } from '../pages.mjs';

test('hosted Auth only accepts canonical project, storage key and public key', () => {
  const config = { url: canonicalURL, storageKey, key: 'sb_publishable_fixture' };
  assert.equal(validateAuthConfig(config), false);
  for (const change of [{ url: 'https://other.supabase.co' }, { storageKey: 'other' },
    { key: 'sb_secret_never' }, { url: 'http://localhost:28478' }])
    assert.throws(() => validateAuthConfig({ ...config, ...change }));
});
test('hosted first slice does not enable ENAMED or label released UI as synthetic pilot', () => {
  const home = renderHome(true, true, true);
  assert.ok(home.includes('href="/amrigs/"'));
  assert.ok(!home.includes('#/enamed'));
  assert.ok(!home.includes('dados sintéticos'));
  assert.ok(!renderAmrigsPilot(true).includes('Piloto local'));
  assert.ok(!renderAmrigsPilot(true).includes('homologação local'));
});
test('hosted AMRIGS requires explicit canonical origin, matching module, assets and no loopback override', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'capi-hosted-'));
  try {
    await writeFile(path.join(root, 'capi-integration.json'), JSON.stringify({ version: 1,
      base: '/questoes/', mode: 'supabase', project: canonicalURL, storageKey }));
    const env = { CAPI_SHARED_LOGIN: '1', CAPI_AMRIGS_HOSTED: '1', CAPI_PUBLIC_ORIGIN: 'https://capi-preparacao.invalid',
      CAPI_APPROVED_PUBLIC_ORIGIN: 'https://capi-preparacao.invalid', CAPI_LOCAL_PREPARATION: '1',
      CAPI_AMRIGS_MANIFEST: new URL('../../../build-inputs/amrigs/manifest.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', CAPI_QUESTOES_DIST: root, CAPI_AMRIGS_ASSETS: root };
    assert.equal((await loadIntegration(env)).amrigsHosted, true);
    for (const change of [{ CAPI_PUBLIC_ORIGIN: 'https://evil.invalid' },
      { CAPI_PUBLIC_ORIGIN: '' }, { CAPI_LOCAL_PREPARATION: '0' },
      { CAPI_LOCAL_SUPABASE_URL: 'http://127.0.0.1:28478' }])
      await assert.rejects(loadIntegration({ ...env, ...change }));
  } finally { await rm(root, { recursive: true, force: true }); }
});
