import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, PageHeader, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import type { SessaoResumo, SessaoStatus } from '../../lib/types'

const STATUS_LABEL: Record<SessaoStatus, string> = {
  rascunho: 'Rascunho',
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
}

const STATUS_TONE: Record<SessaoStatus, 'blue' | 'green' | 'amber' | 'red' | 'terra'> = {
  rascunho: 'amber',
  aberta: 'blue',
  em_andamento: 'green',
  encerrada: 'terra',
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// "Minhas sessões" — porta de entrada do professor (achar sessão passada
// para ver o resultado, ou retomar um rascunho) e, para a coordenação, a
// visão do conjunto de todo mundo. Sempre foi necessidade do desenho
// inicial: até esta versão a tela lia localStorage (sobra da demonstração
// local, de antes do Supabase existir neste app) — sem visão entre
// dispositivos e sem visão nenhuma para a coordenação.
export function ProfessorHome() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  // Coordenação normalmente não tem sessões próprias — abrir já em "todas"
  // evita a tela vazia enganosa. Sem efeito para quem não é admin: o
  // parâmetro só é enviado como true quando ehAdmin também é true (linha
  // abaixo), então o valor inicial aqui não muda nada para professor comum.
  const [verTodas, setVerTodas] = useState(true)

  const ehAdmin = identidade?.role === 'admin'

  useEffect(() => {
    if (!identidade) return
    setCarregando(true)
    setErro(null)
    client
      .listarSessoes({ todas: verTodas && ehAdmin, professorId: identidade.id })
      .then(setSessoes)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar sessões'))
      .finally(() => setCarregando(false))
  }, [identidade, verTodas, ehAdmin])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader
        title="Minhas sessões"
        subtitle={identidade?.nome ?? ''}
        action={
          <div className="flex gap-2 flex-wrap justify-end">
            {ehAdmin && (
              <>
                <Btn variant="secondary" onClick={() => navigate('/coordenacao')}>
                  Coordenação
                </Btn>
                <Btn variant={verTodas ? 'primary' : 'ghost'} onClick={() => setVerTodas((v) => !v)}>
                  {verTodas ? 'Ver só as minhas' : 'Ver todas as sessões'}
                </Btn>
              </>
            )}
            <Btn variant="secondary" onClick={() => navigate('/importacao')}>
              Importar questões
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/professor/nova')}>
              + Nova sessão
            </Btn>
          </div>
        }
      />
      {erro && (
        <div className="mb-4">
          <ErrorBanner message={erro} />
        </div>
      )}
      {carregando ? (
        <Spinner />
      ) : sessoes.length === 0 ? (
        <Card className="p-8 text-center text-textSec">
          {verTodas
            ? 'Nenhuma sessão criada ainda por ninguém.'
            : 'Nenhuma sessão ainda. Crie a primeira para começar.'}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessoes.map((s) => (
            <Card
              key={s.id}
              className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/professor/${s.id}`)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text">{s.titulo}</span>
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </div>
                <div className="text-sm text-textSec">
                  Turma {s.turma}
                  {verTodas && ehAdmin && <> · {s.professor_nome}</>}
                  {' · '}
                  {formatarData(s.criado_em)}
                </div>
              </div>
              <div className="text-lg font-mono font-bold text-blue tracking-widest shrink-0">
                {s.codigo}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
