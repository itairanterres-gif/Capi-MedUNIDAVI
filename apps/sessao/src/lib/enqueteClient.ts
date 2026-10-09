// Ponto único de escolha para o EnqueteClient — mesmo padrão de client.ts:
// demo (em memória) ou produção (Supabase real), via VITE_DATA_MODE.
// Reaproveita a MESMA instância de supabase-js de supabaseClient.ts
// (criarSupabaseClient() é singleton) para que auth.uid() seja coerente
// entre a sessão de questões e a enquete.
import type { EnqueteClient } from './enqueteApi'
import { demoEnqueteClient } from './demoEnqueteClient'
import { criarSupabaseClient } from './supabaseClient'
import { makeSupabaseEnqueteClient } from './supabaseEnqueteClient'

const modo = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'demo'

export const DEMO_MODE = modo !== 'supabase'

export const enqueteClient: EnqueteClient = DEMO_MODE
  ? demoEnqueteClient
  : makeSupabaseEnqueteClient(criarSupabaseClient())
