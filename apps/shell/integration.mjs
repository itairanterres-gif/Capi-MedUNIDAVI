import { realpath, readFile } from 'node:fs/promises';
import path from 'node:path';
import { readApprovedAssets } from './approved-assets.mjs';
import { requireLocalImageFixture } from './private-images.mjs';
import { canonicalURL, storageKey } from './auth-contract.mjs';
import { validateHostedOrigin } from './config-contract.mjs';

export async function loadIntegration(env = process.env) {
  if (env.CAPI_SHARED_LOGIN !== '1') return null;
  const localURL = env.CAPI_LOCAL_SUPABASE_URL;
  if (localURL && !/^http:\/\/127\.0\.0\.1:\d+$/.test(localURL)) throw new Error('Local Auth must use loopback');
  const expectedURL = localURL || canonicalURL;
  const expectedStorageKey = localURL ? 'sb-capi-local-auth-token' : storageKey;
  const key = env.CAPI_SUPABASE_PUBLISHABLE_KEY;
  if (!key?.startsWith('sb_publishable_') || !/^[\w-]+$/.test(key)) throw new Error('Publishable key required');
  if (!env.CAPI_QUESTOES_DIST) throw new Error('Module build required');
  const root = await realpath(env.CAPI_QUESTOES_DIST);
  const manifest = JSON.parse(await readFile(path.join(root, 'capi-integration.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.base !== '/questoes/' || manifest.mode !== 'supabase' || manifest.project !== expectedURL || manifest.storageKey !== expectedStorageKey)
    throw new Error('Incompatible module build');
  if (env.CAPI_AMRIGS_PILOT === '1' && !localURL) throw new Error('AMRIGS pilot is local-only');
  const hosted = env.CAPI_AMRIGS_HOSTED === '1';
  if (hosted) {
    requireLocalImageFixture(env);
    if (localURL) throw new Error('Hosted AMRIGS requires canonical Auth');
    validateHostedOrigin(env);
  }
  const enabled = env.CAPI_AMRIGS_PILOT === '1' || hosted;
  const amrigsAssets = enabled && (!hosted || env.CAPI_LOCAL_PREPARATION === '1') && env.CAPI_AMRIGS_ASSETS ? await realpath(env.CAPI_AMRIGS_ASSETS) : null;
  if (hosted && env.CAPI_LOCAL_PREPARATION === '1' && !amrigsAssets) throw new Error('Hosted AMRIGS assets required');
  const privateImages = hosted ? {
    contract: JSON.parse(await readFile(new URL('../../build-inputs/amrigs/private-storage.contract.json', import.meta.url), 'utf8')),
    hashes: await readApprovedAssets(env),
  } : null;
  return { privateImages, root, url: expectedURL, key, storageKey: expectedStorageKey,
    googleEnabled: !localURL && env.CAPI_GOOGLE_ENABLED === '1', amrigsPilot: enabled, amrigsHosted: hosted, amrigsAssets };
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
export async function moduleAsset(root, pathname) {
  let name;
  try { name = decodeURIComponent(pathname.slice('/questoes/'.length)) || 'index.html'; } catch { return null; }
  if (name.includes('\\') || name.includes('\0') || name.split('/').some(p => p.startsWith('.'))) return null;
  if (name !== 'index.html' && !name.startsWith('assets/')) return null;
  const type = types[path.extname(name)];
  if (!type) return null;
  try {
    const file = await realpath(path.resolve(root, name));
    if (!file.startsWith(root + path.sep)) return null;
    return { body: await readFile(file), type };
  } catch { return null; }
}
export async function amrigsImage(root, pathname) {
  if (!root || !/^\/amrigs\/\d{4}\/[\w.-]+\.png$/.test(pathname)) return null;
  try {
    const file = await realpath(path.resolve(root, pathname.slice('/amrigs/'.length)));
    if (!file.startsWith(root + path.sep)) return null;
    return await readFile(file);
  } catch { return null; }
}
