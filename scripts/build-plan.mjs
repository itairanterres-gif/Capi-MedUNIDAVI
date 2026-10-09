import path from 'node:path';
import { hostedReleaseContract } from '../apps/shell/hosted-release-contract.mjs';
import { validateHostedOrigin } from '../apps/shell/config-contract.mjs';
import { canonicalURL } from '../apps/shell/auth-contract.mjs';

export function buildPlan(root, input, { fixture = false } = {}) {
  if (fixture && (input.CF_PAGES === '1' || input.CI === 'true')) throw new Error('Local fixture forbidden in CI/Pages');
  const origin = fixture ? 'https://capi-preparacao.invalid' : input.CAPI_PUBLIC_ORIGIN;
  const key = fixture ? 'sb_publishable_fixture' : input.CAPI_SUPABASE_PUBLISHABLE_KEY;
  if (!key?.startsWith('sb_publishable_') || !/^[\w-]+$/.test(key)) throw new Error('Existing publishable key required');
  if (!fixture && /fixture|synthetic/.test(key)) throw new Error('Fixture key forbidden for Git build');
  const env = { ...input,
    CAPI_PUBLIC_ORIGIN: origin,
    CAPI_APPROVED_PUBLIC_ORIGIN: fixture ? origin : input.CAPI_APPROVED_PUBLIC_ORIGIN,
    CAPI_LOCAL_PREPARATION: fixture ? '1' : '0',
    CAPI_SHARED_LOGIN: '1', CAPI_AMRIGS_HOSTED: '1', CAPI_HOSTING_TARGET: 'cloudflare-pages',
    CAPI_SUPABASE_PUBLISHABLE_KEY: key, CAPI_GOOGLE_ENABLED: '1', CAPI_LOCAL_SUPABASE_URL: '', CAPI_AMRIGS_PILOT: '0',
    CAPI_QUESTOES_DIST: path.join(root, 'apps/sessao/dist-pages'),
    CAPI_AMRIGS_MANIFEST: path.join(root, 'build-inputs/amrigs/manifest.json'),
    CAPI_AMRIGS_ASSETS: '', CAPI_AMRIGS_PACKAGE: '',
    VITE_CAPI_INTEGRATED: '1', VITE_CAPI_LOCAL_HOMOLOGATION: '0', VITE_DATA_MODE: 'supabase',
    VITE_SUPABASE_URL: canonicalURL, VITE_SUPABASE_ANON_KEY: key,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
    npm_config_update_notifier: 'false',
  };
  hostedReleaseContract(env);
  validateHostedOrigin(env);
  return { env, installs: fixture ? [] : ['apps/sessao', 'apps/shell'], output: path.join(root, 'apps/shell/hosted-dist') };
}
