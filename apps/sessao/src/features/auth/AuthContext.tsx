// Provedor único de identidade para as telas. As features leem useAuth() e
// não sabem se a identidade veio do modo demo ou da auth real do Supabase.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEMO_MODE } from '../../lib/client'
import { CAPI_INTEGRATED } from '../../lib/capiIntegration'
import {
  lerIdentidade,
  salvarIdentidade,
  sairIdentidade,
  type Identidade,
} from '../../lib/identity'
import {
  carregarIdentidadeSupabase,
  entrarComGoogle as entrarComGoogleSupabase,
  entrarComSenha as entrarComSenhaSupabase,
  enviarMagicLink as enviarMagicLinkSupabase,
  enviarRecuperacaoSenha as enviarRecuperacaoSenhaSupabase,
  trocarSenha as trocarSenhaSupabase,
  statusMatricula as statusMatriculaSupabase,
  reenviarConfirmacao as reenviarConfirmacaoSupabase,
  autocadastrar as autocadastrarSupabase,
  onAuthChange,
  sairSupabase,
  type StatusMatricula,
} from '../../lib/supabaseAuth'

interface AuthContextValue {
  identidade: Identidade | null
  carregando: boolean
  modo: 'demo' | 'supabase'
  entrarComoDemo: (identidade: Identidade) => void
  // Caminho preferencial dos alunos: Google institucional.
  entrarComGoogle: () => Promise<void>
  // Docentes continuam podendo receber link mágico.
  enviarMagicLink: (email: string) => Promise<void>
  // Caminho alternativo de alunos que já usam senha local.
  entrarComSenha: (email: string, senha: string) => Promise<void>
  trocarSenha: (nova: string) => Promise<void>
  enviarRecuperacaoSenha: (email: string) => Promise<void>
  recuperandoSenha: boolean
  // Distingue matrícula disponível, conta já existente e e-mail fora do roster.
  statusMatricula: (email: string) => Promise<StatusMatricula>
  // Reenvia o e-mail de confirmação para contas criadas e não confirmadas.
  reenviarConfirmacao: (email: string) => Promise<void>
  autocadastrar: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identidade, setIdentidade] = useState<Identidade | null>(() =>
    DEMO_MODE ? lerIdentidade() : null
  )
  const [carregando, setCarregando] = useState(!DEMO_MODE)
  const [recuperandoSenha, setRecuperandoSenha] = useState(() => CAPI_INTEGRATED && new URLSearchParams(window.location.search).get('capi_recovery') === '1')
  const [erroAcesso, setErroAcesso] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return
    let vivo = true
    let generation = 0
    const resolver = async () => {
      const turn = ++generation
      setCarregando(true)
      try {
        const id = await carregarIdentidadeSupabase()
        if (vivo && turn === generation) { setIdentidade(id); setErroAcesso(false) }
      } catch {
        if (vivo && turn === generation) { setIdentidade(null); setErroAcesso(true) }
      } finally {
        if (vivo && turn === generation) setCarregando(false)
      }
    }
    resolver()
    const off = onAuthChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
      // O callback é síncrono: consultas Auth só depois de liberar o lock do SDK.
      setTimeout(() => { if (vivo) void resolver() }, 0)
    })
    const revalidar = () => { if (vivo) void resolver() }
    window.addEventListener('focus', revalidar)
    window.addEventListener('pageshow', revalidar)
    return () => {
      vivo = false
      off()
      window.removeEventListener('focus', revalidar)
      window.removeEventListener('pageshow', revalidar)
    }
  }, [])

  const entrarComoDemo = useCallback((nova: Identidade) => {
    salvarIdentidade(nova)
    setIdentidade(nova)
  }, [])

  const entrarComGoogle = useCallback(async () => {
    await entrarComGoogleSupabase()
  }, [])

  const enviarMagicLink = useCallback(async (email: string) => {
    await enviarMagicLinkSupabase(email)
  }, [])

  const entrarComSenha = useCallback(async (email: string, senha: string) => {
    await entrarComSenhaSupabase(email, senha)
    // onAuthStateChange recarrega a identidade.
  }, [])

  const enviarRecuperacaoSenha = useCallback(async (email: string) => {
    await enviarRecuperacaoSenhaSupabase(email)
  }, [])

  const trocarSenha = useCallback(async (nova: string) => {
    await trocarSenhaSupabase(nova)
    setRecuperandoSenha(false)
    if (CAPI_INTEGRATED) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    setIdentidade((atual) => (atual ? { ...atual, senhaDefinida: true } : atual))
  }, [])

  const statusMatricula = useCallback(async (email: string) => {
    return await statusMatriculaSupabase(email)
  }, [])

  const reenviarConfirmacao = useCallback(async (email: string) => {
    await reenviarConfirmacaoSupabase(email)
  }, [])

  const autocadastrar = useCallback(async (email: string, senha: string) => {
    await autocadastrarSupabase(email, senha)
  }, [])

  const sair = useCallback(async () => {
    if (DEMO_MODE) {
      sairIdentidade()
      setIdentidade(null)
    } else {
      await sairSupabase()
      setIdentidade(null)
      setErroAcesso(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        identidade,
        carregando,
        modo: DEMO_MODE ? 'demo' : 'supabase',
        entrarComoDemo,
        entrarComGoogle,
        enviarMagicLink,
        entrarComSenha,
        trocarSenha,
        enviarRecuperacaoSenha,
        recuperandoSenha,
        statusMatricula,
        reenviarConfirmacao,
        autocadastrar,
        sair,
      }}
    >
      {erroAcesso ? <main className="max-w-md mx-auto p-6"><h1>Não foi possível confirmar seu acesso</h1><p>Tente novamente. Se o problema continuar, saia e entre de novo.</p><button onClick={() => window.location.reload()}>Tentar novamente</button>{' '}<button onClick={() => { void sair().catch(() => setErroAcesso(true)) }}>Sair para entrar novamente</button></main> : children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
