import { buildHosted } from './build-hosted.mjs';
await import('./build.mjs');
console.log(await buildHosted({ ...process.env, CAPI_HOSTING_TARGET: 'cloudflare-pages' }));
