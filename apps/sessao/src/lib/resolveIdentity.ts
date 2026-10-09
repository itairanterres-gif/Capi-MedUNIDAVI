import type { SupabaseClient } from '@supabase/supabase-js'
import type { Identidade } from './identity'

export async function resolveModuleIdentity(sb: SupabaseClient): Promise<Identidade | null> {
  const { data: sessionData, error: sessionError } = await sb.auth.getSession()
  if (sessionError) throw new Error('Não foi possível verificar sua sessão.')
  if (!sessionData.session) return null
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) throw new Error('Sua sessão não pôde ser validada. Entre novamente.')
  const user = data.user
  const { data: profile, error: profileError } = await sb.from('profiles')
    .select('id,nome,role,senha_definida').eq('id', user.id).maybeSingle()
  if (profileError || !profile || profile.id !== user.id || !['aluno', 'professor', 'admin'].includes(profile.role)) {
    throw new Error('Não foi possível confirmar seu perfil de acesso. Tente novamente.')
  }
  const providers = user.app_metadata?.providers
  const google = user.app_metadata?.provider === 'google' || (Array.isArray(providers) && providers.includes('google'))
  return { id: user.id, nome: profile.nome || (user.email ?? '').split('@')[0], role: profile.role,
    senhaDefinida: google || profile.senha_definida === true }
}
