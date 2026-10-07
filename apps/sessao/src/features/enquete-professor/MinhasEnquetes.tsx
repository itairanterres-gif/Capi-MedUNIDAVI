import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, PageHeader, Spinner } from '../../ui/kit'
import { enqueteClient } from '../../lib/enqueteClient'
import { useAuth } from '../auth/AuthContext'
import type { EnqueteResumo, SessaoStatus } from '../../lib/types'

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
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Espelha ProfessorHome (sessão avaliativa), mas mais simples: enquete não
// tem "resultado nominal" a consultar depois (não há gabarito), então cada
// linha vai direto para conduzir/rever a distribuição, sem tela de
// fechamento separada.
export function MinhasEnquetes() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [enquetes, setEnquetes] = useState<EnqueteResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!identidade) return
    setCarregando(true)
    setErro(null)
    enqueteClient
      .listarEnquetes()
      .then(setEnquetes)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar enquetes'))
      .finally(() => setCarregando(false))
  }, [identidade])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader
        title="Minhas enquetes"
        subtitle={identidade?.nome ?? ''}
        action={
          <Btn variant="terra" onClick={() => navigate('/professor/enquetes/nova')}>
            + Nova enquete
          </Btn>
        }
      />
      {erro && (
        <div className="mb-4">
          <ErrorBanner message={erro} />
        </div>
      )}
      {carregando ? (
        <Spinner />
      ) : enquetes.length === 0 ? (
        <Card className="p-8 text-center text-textSec">
          Nenhuma enquete ainda. Crie a primeira — opinião, quebra-gelo ou escala.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {enquetes.map((e) => (
            <Card
              key={e.id}
              className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/professor/enquetes/${e.id}`)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text">{e.titulo}</span>
                  <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                </div>
                <div className="text-sm text-textSec">
                  {e.turma ? `Turma ${e.turma}` : 'Sem turma fixa'} · {formatarData(e.criado_em)}
                </div>
              </div>
              <div className="text-lg font-mono font-bold text-terra tracking-widest shrink-0">{e.codigo}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
