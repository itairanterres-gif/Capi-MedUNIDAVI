// Generates a static release candidate locally; never deploys or calls Auth.
import { mkdir, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { requireLocalImageFixture } from './private-images.mjs';
import { loadIntegration } from './integration.mjs';
import { validateHostedOrigin } from './config-contract.mjs';
import { pagesHeaders, pagesRedirects, notFoundHTML } from './pages-hosting.mjs';
import { readApprovedAssets } from './approved-assets.mjs';
import { createShell } from './server.mjs';
import { publicAssets } from '../../packages/public-about/assets.mjs';

export async function buildHosted(env = process.env) {
  if (env.CAPI_AMRIGS_HOSTED !== '1') throw new Error('Explicit hosted configuration required');
  requireLocalImageFixture(env);
  const origin = validateHostedOrigin(env);
  if (env.CAPI_LOCAL_PREPARATION !== '1' && /fixture|synthetic/.test(env.CAPI_SUPABASE_PUBLISHABLE_KEY || ''))
    throw new Error('Fixture key is local preparation only');
  if (!['cloudflare-pages', 'vercel', undefined].includes(env.CAPI_HOSTING_TARGET)) throw new Error('Unsupported hosting target');
  if (env.CAPI_HOSTING_TARGET === 'cloudflare-pages' && env.CAPI_GOOGLE_ENABLED === '1')
    throw new Error('Google OAuth is outside the Pages preparation scope');
  const integration = await loadIntegration(env);
  if (!integration?.amrigsHosted) throw new Error('Hosted integration required');
  const output = fileURLToPath(new URL('./hosted-dist/', import.meta.url));
  await mkdir(output, { recursive: true });
  if ((await readdir(output)).length) throw new Error('Output must be empty; preserve previous artifact before rebuilding');
  const server = createShell({ integration });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [route, file] of [['/', 'index.html'], ['/sobre', 'sobre/index.html'],
      ['/entrar', 'entrar/index.html'], ['/amrigs/', 'amrigs/index.html'],
      ['/auth-config.json', 'auth-config.json'], ['/auth.js', 'auth.js'], ['/amrigs.js', 'amrigs.js'],
      ['/shell.css', 'shell.css']]) {
      const response = await fetch(base + route);
      if (!response.ok) throw new Error(`Build route unavailable: ${route}`);
      const target = path.join(output, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(await response.arrayBuffer()));
    }
    for (const [route, asset] of publicAssets) await writeFile(path.join(output, route.slice(1)), await readFile(asset.file));
    // Module assets and original figures only; no repositories or editorial archives.
    await mkdir(path.join(output, 'questoes'), { recursive: true });
    await cp(path.join(integration.root, 'index.html'), path.join(output, 'questoes/index.html'));
    await cp(path.join(integration.root, 'assets'), path.join(output, 'questoes/assets'), { recursive: true });
    const imageHashes = await readApprovedAssets(env);
    // Production never exports protected images; only ignored local fixture does.
    if (env.CAPI_LOCAL_PREPARATION === '1') for (const [name, hash] of Object.entries(imageHashes)) {
      if (!/^\d{4}\/[\w.-]+\.png$/.test(name)) throw new Error('Invalid image path');
      const bytes = await readFile(path.join(integration.amrigsAssets, name));
      if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('Image hash mismatch');
      const target = path.join(output, 'amrigs', name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    const config = {
      outputDirectory: 'hosted-dist',
      rewrites: [{ source: '/questoes/:path*', destination: '/questoes/index.html' }],
      headers: [{ source: '/(.*)', headers: [
        { key: 'Cache-Control', value: 'no-store' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${integration.url} ${integration.url.replace('https:', 'wss:')}; frame-ancestors 'none'; form-action 'self'; base-uri 'none'` },
      ] }],
    };
    if (env.CAPI_HOSTING_TARGET === 'cloudflare-pages') {
      if (integration.googleEnabled) throw new Error('Google OAuth is outside the Pages preparation scope');
      await writeFile(path.join(output, '_headers'), pagesHeaders(integration.url));
      await writeFile(path.join(output, '_redirects'), pagesRedirects);
      await writeFile(path.join(output, '404.html'), notFoundHTML);
      await writeFile(new URL('./pages.candidate.json', import.meta.url), JSON.stringify({
        hosting: 'cloudflare-pages', outputDirectory: 'hosted-dist', origin,
        localPreparation: env.CAPI_LOCAL_PREPARATION === '1',
        functions: false, credentials: 'publishable-only',
        sessionRouting: 'HashRouter under /questoes/',
      }, null, 2) + '\n');
    } else if (!env.CAPI_HOSTING_TARGET || env.CAPI_HOSTING_TARGET === 'vercel') {
      await writeFile(new URL('./vercel.candidate.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
    } else throw new Error('Unsupported hosting target');
    return output;
  } finally { await new Promise(resolve => server.close(resolve)); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await buildHosted());
