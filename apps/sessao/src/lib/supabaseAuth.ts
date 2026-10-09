// Ponte entre supabase.auth e a Identidade abstrata que as telas consomem.
// Toda a mecânica do schema (RLS + RPCs security definer) ancora em auth.uid();
// aqui resolvemos "quem é o usuário logado" a partir da sessão + profiles.
//
// Usa o MESMO cliente singleton do supabaseClient.ts — ver a nota lá sobre
// por que a instância precisa ser única.

import { criarSupabaseClient } from './supabaseClient'
import type { Identidade } from './identity'
import { resolveModuleIdentity } from './resolveIdentity'

import {preserveLoginDestination,restoreLoginDestination,clearDestination} from './loginDestination'

const DOMINIO_INSTITUCIONAL = '@unidavi.edu.br'

export type StatusMatricula = 'disponivel' | 'conta_existente' | 'nao_encontrada'

export function emailInstitucionalValido(email: string): boolean {
  return email.trim().toLowerCase().endsWith(DOMINIO_INSTITUCIONAL)
}

// Resolve a Identidade do usuário atualmente logado (sessão + profiles).
// Retorna null sem sessão; perfil ausente ou inválido nunca concede papel.
export async function carregarIdentidadeSupabase(): Promise<Identidade | null> {
  const sb = criarSupabaseClient()
  if (!sb) return null

  const identity = await resolveModuleIdentity(sb)
  restoreLoginDestination()
  if (identity) clearDestination(sessionStorage)
  return identity
}

// Login Google institucional — caminho preferencial para alunos. O parâmetro
// hd apenas sugere o domínio na tela do Google; a trava real está no hook do
// banco, que aceita somente e-mails @unidavi.edu.br presentes em matriculas
// (ou docentes explicitamente autorizados).
export async function entrarComGoogle(): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  preserveLoginDestination()
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
        hd: 'unidavi.edu.br',
      },
    },
  })
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('provider')
        ? 'O login com Google ainda não está habilitado neste projeto. Avise a coordenação.'
        : error.message
    )
  }
}

// Login por SENHA — caminho alternativo do aluno.
export async function entrarComSenha(email: string, senha: string): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  if (!emailInstitucionalValido(email)) {
    throw new Error(`Use o seu e-mail institucional (${DOMINIO_INSTITUCIONAL}).`)
  }
  const { error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    throw new Error(
      msg.includes('email not confirmed')
        ? 'Sua conta existe, mas o e-mail ainda não foi confirmado. Entre com Google institucional ou reenvie a confirmação.'
        : msg.includes('invalid')
          ? 'E-mail ou senha incorretos. Use "Esqueci minha senha" ou entre com Google institucional.'
          : error.message
    )
  }
}

// Troca a senha e marca o perfil — as duas coisas, nesta ordem: se marcasse
// antes e a troca falhasse, o aluno ficaria preso com a senha inicial e sem
// a tela que obriga a trocá-la.
export async function trocarSenha(nova: string): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  const { error } = await sb.auth.updateUser({ password: nova })
  if (error) throw error
  const { error: e2 } = await sb.rpc('rpc_confirmar_senha_definida')
  if (e2) throw e2
}

// Dispara o magic link. Mantido para docentes.
export async function enviarMagicLink(email: string): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  if (!emailInstitucionalValido(email)) {
    throw new Error(`Use o seu e-mail institucional (${DOMINIO_INSTITUCIONAL}).`)
  }
  preserveLoginDestination()
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

// Distingue os três estados que a antiga checagem booleana confundia:
// - disponivel: está na matrícula e ainda não iniciou cadastro;
// - conta_existente: está na matrícula e já existe/provisionou conta;
// - nao_encontrada: não pertence ao roster carregado pela coordenação.
export async function statusMatricula(email: string): Promise<StatusMatricula> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  const { data, error } = await sb.rpc('rpc_status_matricula', {
    p_email: email.trim().toLowerCase(),
  })
  if (error) throw error
  if (data === 'disponivel' || data === 'conta_existente' || data === 'nao_encontrada') {
    return data
  }
  throw new Error('Não foi possível verificar a matrícula agora.')
}

// Compatibilidade com o fluxo anterior; telas novas devem preferir
// statusMatricula para não confundir "conta existente" com "não matriculado".
export async function matriculaDisponivel(email: string): Promise<boolean> {
  return (await statusMatricula(email)) === 'disponivel'
}

// Autocadastro por e-mail/senha — alternativa ao Google. O aluno escolhe a
// própria senha e confirma o e-mail pelo fluxo nativo do Supabase.
export async function autocadastrar(email: string, senha: string): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  if (!emailInstitucionalValido(email)) {
    throw new Error(`Use o seu e-mail institucional (${DOMINIO_INSTITUCIONAL}).`)
  }
  preserveLoginDestination()
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password: senha,
    options: { data: { autocadastro: true }, emailRedirectTo: redirectTo },
  })
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('já') || error.message.toLowerCase().includes('registered')
        ? 'Este e-mail já tem conta. Entre com Google institucional ou use "Entrar".'
        : error.message
    )
  }
}

// Recupera o caso que motivou a correção: conta criada, mas confirmação não
// concluída. Também é útil quando a primeira mensagem de confirmação expirou.
export async function reenviarConfirmacao(email: string): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  if (!emailInstitucionalValido(email)) {
    throw new Error(`Use o seu e-mail institucional (${DOMINIO_INSTITUCIONAL}).`)
  }
  preserveLoginDestination()
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await sb.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    throw new Error(
      msg.includes('already') || msg.includes('confirmed')
        ? 'Este e-mail já está confirmado. Volte ao login ou entre com Google institucional.'
        : error.message
    )
  }
}

export async function sairSupabase(): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) return
  const { error } = await sb.auth.signOut({ scope: 'local' })
  if (error) throw error
  clearDestination(sessionStorage)
}

// Dispara o e-mail de redefinição de senha.
export async function enviarRecuperacaoSenha(email: string): Promise<void> {
  const sb = criarSupabaseClient()
  if (!sb) throw new Error('Supabase não configurado.')
  if (!emailInstitucionalValido(email)) {
    throw new Error(`Use o seu e-mail institucional (${DOMINIO_INSTITUCIONAL}).`)
  }
  preserveLoginDestination()
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
  if (error) throw error
}

// Assina mudanças de sessão. O EVENTO importa: ao voltar do link de
// redefinição, o Supabase emite 'PASSWORD_RECOVERY' e já estabelece uma
// sessão. Sem tratar esse evento, o aluno entraria direto no app sem nunca
// definir a senha nova.
export function onAuthChange(cb: (evento?: string) => void): () => void {
  const sb = criarSupabaseClient()
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') clearDestination(sessionStorage)
    cb(evento)
  })
  return () => data.subscription.unsubscribe()
}
