import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const integrated = env.VITE_CAPI_INTEGRATED === '1'
  const local = env.VITE_CAPI_LOCAL_HOMOLOGATION === '1' && /^http:\/\/127\.0\.0\.1:\d+$/.test(env.VITE_SUPABASE_URL || '')
  if (integrated && (env.VITE_DATA_MODE !== 'supabase' || (!local && env.VITE_SUPABASE_URL !== 'https://ggjxbumtnizaeomioves.supabase.co') || !env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))) throw new Error('Build Capi requer projeto autorizado, publishable key e modo supabase.')
  return {
  // Integrated delivery must not ship the legacy in-memory question corpus.
  // Standalone demo builds keep their existing adapters and seed unchanged.
  resolve: { alias: integrated ? [
    { find: './demoClient', replacement: fileURLToPath(new URL('./src/lib/integratedDemoDisabled.ts', import.meta.url)) },
    { find: './demoEnqueteClient', replacement: fileURLToPath(new URL('./src/lib/integratedDemoDisabled.ts', import.meta.url)) },
  ] : [] },
  base: integrated ? '/questoes/' : '/',
  plugins: [react(), ...(integrated ? [{ name: 'capi-manifest', generateBundle() {
    this.emitFile({ type: 'asset' as const, fileName: 'capi-integration.json', source: JSON.stringify({ version: 1, base: '/questoes/', mode: 'supabase', project: env.VITE_SUPABASE_URL, storageKey: local ? 'sb-capi-local-auth-token' : 'sb-ggjxbumtnizaeomioves-auth-token' }) })
  } } as Plugin] : [])],
  server: { host: true, port: 5173 },
  }
})
