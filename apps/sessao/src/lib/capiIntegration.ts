const canonical = 'https://ggjxbumtnizaeomioves.supabase.co'
export const CAPI_INTEGRATED = import.meta.env.VITE_CAPI_INTEGRATED === '1'
const local = import.meta.env.VITE_CAPI_LOCAL_HOMOLOGATION === '1' && /^http:\/\/127\.0\.0\.1:\d+$/.test(import.meta.env.VITE_SUPABASE_URL || '')
export const CAPI_STORAGE_KEY = local ? 'sb-capi-local-auth-token' : 'sb-ggjxbumtnizaeomioves-auth-token'
if (CAPI_INTEGRATED && (import.meta.env.VITE_DATA_MODE !== 'supabase' || (!local && import.meta.env.VITE_SUPABASE_URL !== canonical) || import.meta.env.BASE_URL !== '/questoes/')) {
  throw new Error('Configuração incompatível com a entrada Capi.')
}
