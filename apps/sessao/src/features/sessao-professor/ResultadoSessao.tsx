import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Btn, Card, ErrorBanner, PageHeader, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { rotuloSP, rotuloUC } from '../../lib/rotulos'
import type { ResultadoSessao as Resultado, Sessao } from '../../lib/types'

// Corte único para "questão crítica" e "aluno em dificuldade". É um número
// escolhido, não uma constante da literatura — o coordenador pode trocar
// aqui, ou trocar por critério relativo (média menos um desvio) se preferir.
const CORTE = 50

// Fechamento da sessão para o PROFESSOR DA SESSÃO e a COORDENAÇÃO.
// Contém dado NOMINAL por aluno — decisão registrada em 28/07 (ver a
// migration 20260728110000_resultados.sql). Nunca projetar esta tela: a
// projeção (features/projecao) mostra apenas agregados.
export function ResultadoSessao() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const navigate = useNavigate()
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [res, setRes] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!sessaoId) return
    try {
      setSessao(await client.getSessao(sessaoId))
      setRes(await client.resultadoSessao(sessaoId))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o resultado')
    }
  }, [sessaoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (erro) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <ErrorBanner message={erro} />
      </div>
    )
  }
  if (!sessao || !res) return <Spinner />

  const criticas = res.questoes.filter((q) => q.respostas > 0 && q.pct < CORTE)
  const emDificuldade = res.alunos.filter((a) => a.respondidas > 0 && a.pct < CORTE)

  return (
    <div className="max-w-3xl mx-auto p-6 pb-16">
      <div className="rounded-lg border-l-4 border-red bg-redLight px-4 py-3 text-xs font-semibold text-red mb-5">
        Tela restrita ao professor da sessão e à coordenação. Contém desempenho individual —
        não projetar.
      </div>

      <PageHeader
        title={sessao.titulo}
        subtitle={`${rotuloUC(sessao.uc_slug)} · ${rotuloSP(sessao.sp_referencia)} · turma ${sessao.turma}`}
        action={
          <Btn variant="secondary" onClick={() => navigate('/professor')}>
            Minhas sessões
          </Btn>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue">{res.participantes}</div>
          <div className="text-xs text-textSec">participantes</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green">{res.acerto_medio}%</div>
          <div className="text-xs text-textSec">acerto médio</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-amber">{criticas.length}</div>
          <div className="text-xs text-textSec">questões críticas</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-terra">{emDificuldade.length}</div>
          <div className="text-xs text-textSec">alunos em dificuldade</div>
        </Card>
      </div>

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-text mb-1">Questões críticas</h2>
        <p className="text-xs text-textSec mb-3">Abaixo de {CORTE}% de acerto na turma.</p>
        {criticas.length === 0 ? (
          <p className="text-sm text-textSec">Nenhuma questão abaixo do corte.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {criticas.map((q) => (
              <div key={q.sessao_questao_id} className="flex items-start gap-3 border-b border-borderLight pb-2 last:border-0">
                <span className="h-6 w-6 shrink-0 rounded-full bg-amberLight text-amber flex items-center justify-center text-xs font-bold">
                  {q.numero_origem ?? q.ordem}
                </span>
                <span className="flex-1 text-sm text-text">{q.enunciado}</span>
                <span className="text-sm font-bold text-terra shrink-0">{q.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-text mb-1">Desempenho por aluno</h2>
        <p className="text-xs text-textSec mb-3">
          Nominal, para acompanhamento pedagógico. Ordenado do menor acerto para o maior.
        </p>
        <div className="flex flex-col">
          {res.alunos.map((a) => {
            const cor = a.pct < CORTE ? 'text-terra' : a.pct < 70 ? 'text-amber' : 'text-green'
            const barra = a.pct < CORTE ? 'bg-terra' : a.pct < 70 ? 'bg-amber' : 'bg-green'
            return (
              <div key={a.aluno_id} className="flex items-center gap-3 py-2 border-b border-borderLight last:border-0">
                <span className="flex-1 text-sm text-text truncate">{a.nome || '(sem nome)'}</span>
                <span className="h-1.5 w-20 rounded bg-border overflow-hidden shrink-0">
                  <span className={`block h-full ${barra}`} style={{ width: `${a.pct}%` }} />
                </span>
                <span className={`text-sm font-bold w-12 text-right shrink-0 ${cor}`}>{a.pct}%</span>
                <span className="text-xs text-textSec w-14 text-right shrink-0">
                  {a.certas}/{a.respondidas}
                </span>
                {a.pct < CORTE && a.respondidas > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-terraLight text-terra shrink-0">
                    atenção
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
