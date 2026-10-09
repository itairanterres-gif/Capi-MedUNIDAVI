import { canonicalURL, storageKey } from './auth-contract.mjs';

// Host choice is explicit; Auth remains bound to the existing canonical project.
// Reserved .invalid origins are only usable for local preparation.
export function validateHostedOrigin(env) {
  const value = env.CAPI_PUBLIC_ORIGIN;
  if (!value || value !== env.CAPI_APPROVED_PUBLIC_ORIGIN) throw new Error('Explicit matching approved origin required');
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid hosted origin'); }
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(url.hostname) ||
      /\.(localhost|local|test|example)$/.test(url.hostname)) throw new Error('HTTPS DNS origin without path, credentials or port required');
  if (url.hostname.endsWith('.invalid') && env.CAPI_LOCAL_PREPARATION !== '1')
    throw new Error('Placeholder origin is local preparation only');
  return value;
}
export function validateAuthConfig(config) {
  const local = /^http:\/\/127\.0\.0\.1:\d+$/.test(config.url || '');
  if (!(local ? config.storageKey === 'sb-capi-local-auth-token' :
    config.url === canonicalURL && config.storageKey === storageKey)) throw new Error('Unauthorized Auth configuration');
  if (!config.key?.startsWith('sb_publishable_') || !/^[\w-]+$/.test(config.key)) throw new Error('Publishable key required');
  return local;
}
