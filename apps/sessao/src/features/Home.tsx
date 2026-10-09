import { useNavigate } from 'react-router-dom'
import { Btn, Card, PageHeader } from '../ui/kit'
import { DEMO_MODE } from '../lib/client'
import { useAuth } from './auth/AuthContext'
import { ehStaff, PROFESSOR_DEMO } from '../lib/identity'

export function Home() {
  const navigate = useNavigate()
  const { identidade, entrarComoDemo, sair, modo } = useAuth()

  function irParaProfessor() {
    // No demo, entrar na área do professor assume a persona docente.
    if (modo === 'demo') entrarComoDemo(PROFESSOR_DEMO)
    navigate('/professor')
  }

  const mostrarBotaoProfessor = modo === 'demo' || ehStaff(identidade)

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <PageHeader
          title="Sessão de Questões"
          subtitle="Curso de Medicina · UNIDAVI Rio do Sul"
        />
        <Card className="p-6 flex flex-col gap-4">
          {modo === 'supabase' && identidade && (
            <p className="text-sm text-textSec">
              Você está logado como <strong>{identidade.nome}</strong>.
            </p>
          )}
          <p className="text-sm text-textSec">
            Escolha como entrar {DEMO_MODE ? '(modo demo)' : ''}:
          </p>
          {mostrarBotaoProfessor && (
            <Btn variant="primary" onClick={irParaProfessor} className="w-full">
              Sou professor(a) — conduzir sessão
            </Btn>
          )}
          <Btn variant="secondary" onClick={() => navigate('/aluno')} className="w-full">
            Sou aluno(a) — entrar com código
          </Btn>
          {modo === 'supabase' && identidade && (
            <button
              className="text-xs text-textMuted underline mt-1"
              onClick={() => sair()}
            >
              Sair
            </button>
          )}
        </Card>
        <p className="text-xs text-textMuted mt-4 text-center">
          Atividade formativa. Não compõe nota.
        </p>
      </div>
    </div>
  )
}
