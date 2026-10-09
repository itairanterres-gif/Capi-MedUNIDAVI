import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readApprovedAssets } from '../apps/shell/approved-assets.mjs';
import { canonicalURL, storageKey } from '../apps/shell/auth-contract.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'apps/shell/hosted-dist');
const files = [];
async function walk(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), prefix + entry.name + '/');
    else files.push(prefix + entry.name);
  }
}
await walk(output);
assert.equal(files.length, 17);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = {};
for (const name of files) {
  const bytes = await readFile(path.join(output, name));
  hashes[name] = hash(bytes);
  assert.ok(!/(\.env|\.map$|\.sql$|manifest\.json|PACOTE|PARECER)/.test(name));
  if (/\.(js|html|json)$/.test(name)) {
    const text = bytes.toString();
    assert.ok(!/enamed/i.test(text), name);
    assert.ok(!/sb_secret_[A-Za-z0-9_-]+|-----BEGIN .*PRIVATE KEY/.test(text), name);
    assert.ok(!text.includes('sessao-questoes:demo-store:v1'));
  }
}
const images = await readApprovedAssets({ CAPI_AMRIGS_MANIFEST: path.join(root, 'build-inputs/amrigs/manifest.json') });
assert.equal(files.filter(f => f.endsWith('.png')).length, 0);
assert.equal(Object.keys(images).length, 31);
assert.ok(!files.some(name => /^amrigs\/\d{4}\//.test(name)));
const config = JSON.parse(await readFile(path.join(output, 'auth-config.json')));
assert.equal(config.url, canonicalURL); assert.equal(config.storageKey, storageKey);
assert.equal(config.key, 'sb_publishable_fixture'); assert.equal(config.googleEnabled, true);
for (const name of ['index.html', 'sobre/index.html', 'entrar/index.html', 'questoes/index.html', 'amrigs/index.html', '_headers', '_redirects', '404.html']) assert.ok(files.includes(name));
const report = { status: 'PASS', build: 'npm run build:pages:fixture',
  productionBuildCommand: 'npm run build:pages', output: 'apps/shell/hosted-dist',
  buildRoot: 'repository-root', files: files.length, images: 0, manifestHashes: 31, remoteImageByteHashesVerified: false,
  testsReportedSeparately: true, fixture: true, originUsed: 'https://capi-preparacao.invalid',
  proposedOriginNotCreatedOrVerified: 'https://capi-medunidavi.pages.dev',
  sourcePackageSHA256: '0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40',
  fullDraftPackageIncludedInHostingCheckout: false, draftCountPreserved: 477,
  inputsExternalToCheckout: false, dependencyDownloadOrCleanInstallTested: false,
  linuxOrCloudflareBuildTested: false, remoteAuthOrRLSTested: false,
  pushPerformed: false, deployPerformed: false, migrationPerformed: false, hashes };
await writeFile(path.join(root, 'RESULTADOS-GIT-LOCAL.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', files: 17, images: 0, externalInputs: false, fixture: true }));
