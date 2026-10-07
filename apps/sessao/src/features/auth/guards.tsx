// Guardas de rota. No modo produção (supabase) protegem por sessão e role;
// no modo demo preservam o comportamento sem atrito de hoje (o professor
// "entra" como PROFESSOR_DEMO ao acessar a área do professor; o aluno escolhe
// persona na própria tela de entrada).

import { useEffect, type ReactNode } from 'react'
import { Card, PageHeader, Spinner } from '../../ui/kit'
import { ADMIN_DEMO, ehAdmin, ehStaff, PROFESSOR_DEMO } from '../../lib/identity'
import { useAuth } from './AuthContext'
import { Login } from './Login'
import { TrocarSenha } from './TrocarSenha'

// Enquanto a senha inicial não for trocada, NADA do app abre. Fica numa
// função só para os três guards compartilharem a mesma regra — senão bastaria
// um deles esquecer e a obrigatoriedade viraria sugestão.
function precisaTrocarSenha(identidade: { senhaDefinida?: boolean } | null) {
  return !!identidade && identidade.senhaDefinida === false
}

function SemPermissao({ mensagem }: { mensagem: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PageHeader title="Sem acesso" subtitle="Sessão de Questões · UNIDAVI" />
        <Card className="p-6 text-center text-textSec text-sm">
          {mensagem}{' '}
          <a href="#/" className="text-blue underline">
            Voltar ao início
          </a>
        </Card>
      </div>
    </div>
  )
}

// Exige que o usuário conduza sessões: professor ou admin.
export function RequireStaff({ children }: { children: ReactNode }) {
  const { identidade, carregando, modo, entrarComoDemo, recuperandoSenha } = useAuth()

  // Demo: acessar a área do professor entra automaticamente como o professor
  // demo, sem tela de login (mantém o fluxo de desenvolvimento).
  useEffect(() => {
    if (modo === 'demo' && !ehStaff(identidade)) {
      entrarComoDemo(PROFESSOR_DEMO)
    }
  }, [modo, identidade, entrarComoDemo])

  if (modo === 'demo') {
    return ehStaff(identidade) ? <>{children}</> : <Spinner />
  }

  if (carregando) return <Spinner />
  if (!identidade) return <Login />
  if (recuperandoSenha) return <TrocarSenha motivo="recuperacao" />
  if (precisaTrocarSenha(identidade)) return <TrocarSenha />
  if (!ehStaff(identidade)) {
    return <SemPermissao mensagem="Esta área é para docentes. Sua conta está registrada como aluno(a)." />
  }
  return <>{children}</>
}

// Exige coordenação: só admin. Governa a administração de pessoas, papéis e
// turmas — dado pessoal nominal de docentes E alunos, que não deve estar ao
// alcance de professor comum.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { identidade, carregando, modo, entrarComoDemo, recuperandoSenha } = useAuth()

  // Demo: entra automaticamente como a coordenação, para a tela ser
  // navegável sem auth real (mesmo padrão do RequireStaff).
  useEffect(() => {
    if (modo === 'demo' && !ehAdmin(identidade)) {
      entrarComoDemo(ADMIN_DEMO)
    }
  }, [modo, identidade, entrarComoDemo])

  if (modo === 'demo') {
    return ehAdmin(identidade) ? <>{children}</> : <Spinner />
  }

  if (carregando) return <Spinner />
  if (!identidade) return <Login />
  if (recuperandoSenha) return <TrocarSenha motivo="recuperacao" />
  if (precisaTrocarSenha(identidade)) return <TrocarSenha />
  if (!ehAdmin(identidade)) {
    return (
      <SemPermissao mensagem="Esta área é da coordenação. Sua conta não tem esse acesso." />
    )
  }
  return <>{children}</>
}

// Exige apenas usuário autenticado (área do aluno em produção). No demo, a
// identidade de aluno é definida na própria tela de entrada por código.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { identidade, carregando, modo, recuperandoSenha } = useAuth()

  if (modo === 'demo') return <>{children}</>

  if (carregando) return <Spinner />
  if (!identidade) return <Login />
  if (recuperandoSenha) return <TrocarSenha motivo="recuperacao" />
  if (precisaTrocarSenha(identidade)) return <TrocarSenha />
  return <>{children}</>
}
