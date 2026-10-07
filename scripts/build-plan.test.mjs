import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { buildPlan } from './build-plan.mjs';
import { readApprovedAssets } from '../apps/shell/approved-assets.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
test('relocation computes all inputs inside the checkout and ignores inherited external paths', () => {
  const result = buildPlan(root, { CAPI_AMRIGS_ASSETS: '/external/private', CAPI_QUESTOES_DIST: '/old/mirror' }, { fixture: true });
  for (const name of ['CAPI_AMRIGS_ASSETS', 'CAPI_QUESTOES_DIST', 'CAPI_AMRIGS_MANIFEST'])
    assert.ok(result.env[name].startsWith(root));
  assert.equal(result.installs.length, 0);
  assert.equal(result.output, path.join(root, 'apps/shell/hosted-dist'));
  assert.equal(result.env.VITE_SUPABASE_ANON_KEY, result.env.CAPI_SUPABASE_PUBLISHABLE_KEY);
  assert.equal(result.env.CAPI_AMRIGS_PACKAGE, '');
});
test('proposed host does not turn fixture or missing key into a deployable Git build', () => {
  const env = { CAPI_PUBLIC_ORIGIN: 'https://capi-medunidavi.pages.dev', CAPI_APPROVED_PUBLIC_ORIGIN: 'https://capi-medunidavi.pages.dev' };
  assert.throws(() => buildPlan(root, env), /publishable/);
  assert.throws(() => buildPlan(root, { ...env, CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', CAPI_LOCAL_PREPARATION: '1' }), /Fixture/);
  assert.throws(() => buildPlan(root, { ...env, CAPI_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_marker' }), /publishable/);
});
test('fixture switch is unavailable on Cloudflare or CI', () => {
  for (const env of [{ CF_PAGES: '1' }, { CI: 'true' }])
    assert.throws(() => buildPlan(root, env, { fixture: true }), /forbidden/);
});
test('approved manifest carries hashes/count/status and no question bodies', async () => {
  const manifest = path.join(root, 'build-inputs/amrigs/manifest.json');
  const images = await readApprovedAssets({ CAPI_AMRIGS_MANIFEST: manifest });
  assert.equal(Object.keys(images).length, 31);
  const data = JSON.parse(await readFile(manifest, 'utf8'));
  assert.equal(data.total, 477); assert.equal(data.status, 'draft');
  assert.equal(data.questoes, undefined);
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'capi-manifest-'));
  try {
    const altered = path.join(tmp, 'altered.json');
    await writeFile(altered, JSON.stringify({ ...data, total: 476 }));
    await assert.rejects(readApprovedAssets({ CAPI_AMRIGS_MANIFEST: altered }), /hash mismatch/);
  } finally { await rm(tmp, { recursive: true, force: true }); }
});
test('nested npm locks contain each dependency requested by the build packages', async () => {
  for (const dir of ['apps/shell', 'apps/sessao']) {
    const pkg = JSON.parse(await readFile(path.join(root, dir, 'package.json')));
    const lock = JSON.parse(await readFile(path.join(root, dir, 'package-lock.json')));
    for (const kind of ['dependencies', 'devDependencies']) {
      assert.deepEqual(lock.packages[''][kind], pkg[kind]);
      for (const name of Object.keys(pkg[kind] || {})) assert.ok(lock.packages['node_modules/' + name]?.version, name);
    }
    assert.ok(Object.keys(lock.packages).some(name => name.includes('@esbuild/linux-x64')), 'Linux build tool pinned');
  }
});
test('vendored integrated source has only the seed type contract, no legacy question corpus', async () => {
  const seed = await readFile(path.join(root, 'apps/sessao/src/lib/questoes-seed.ts'), 'utf8');
  assert.ok(seed.includes('QUESTOES_SEED: QuestaoSeed[] = []'));
  assert.ok(!/enamed/i.test(seed));
  assert.ok(seed.length < 1500);
});
