// Ponto único de escolha: modo demo (em memória, sem backend) ou produção
// (Supabase real). Controlado por VITE_DATA_MODE — 'demo' (default) ou
// 'supabase'. Trocar para produção não exige tocar nenhuma tela: todas
// consomem apenas a interface SessaoClient (src/lib/api.ts).
import type { SessaoClient } from './api'
import { demoClient } from './demoClient'
import { criarSupabaseClient, makeSupabaseSessaoClient } from './supabaseClient'

const modo = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'demo'

export const DEMO_MODE = modo !== 'supabase'

export const client: SessaoClient = DEMO_MODE
  ? demoClient
  : makeSupabaseSessaoClient(criarSupabaseClient())
