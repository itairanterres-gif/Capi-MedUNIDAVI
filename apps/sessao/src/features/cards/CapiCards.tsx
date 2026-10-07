import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Btn, Card, ErrorBanner, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import { rotuloSP } from '../../lib/rotulos'
import type { CapiCard, NotaCard } from '../../lib/types'

// Capi-Cards — revisão espaçada do aluno.
//
// Padrão institucional (repositório itairanterres-alt/Capi-MedUnidavi + a
// instrução CAPI-CARDS). O que é regra, não estilo:
//   * ZERO nota numérica. Não há acerto a medir aqui: o aluno diz como foi a
//     memória, e isso alimenta o agendamento. A aferição de acerto é a da aula.
//   * Resposta primeiro, justificativa depois — nunca justificar de trás para
//     frente.
//   * Sem gamificação dopaminérgica: nada de XP, streak, ranking, confete,
//     cronômetro. Conclusão sóbria.
//   * Escala de quatro: Novamente / Difícil / Bom / Fácil.
//
// Os intervalos mostrados nos botões vêm do servidor para ESTE card
// (rpc_previa_intervalos) — rótulo fixo mentiria a partir da segunda revisão.

const NOTAS: { nota: NotaCard; label: string; cor: string; fundo: string; borda: string }[] = [
  { nota: 1, label: 'Novamente', cor: 'text-red', fundo: 'bg-redLight', borda: 'border-red' },
  { nota: 2, label: 'Difícil', cor: 'text-amber', fundo: 'bg-amberLight', borda: 'border-amber' },
  { nota: 3, label: 'Bom', cor: 'text-blue', fundo: 'bg-blueLight', borda: 'border-blue' },
  { nota: 4, label: 'Fácil', cor: 'text-green', fundo: 'bg-greenLight', borda: 'border-green' },
]

function dias(n: number | undefined): string {
  if (!n) return ''
  return n === 1 ? '1 dia' : `${n} dias`
}

export function CapiCards() {
  const { sessaoId } = useParams<{ sessaoId?: string }>()
  const navigate = useNavigate()
  const { identidade } = useAuth()

  const [fila, setFila] = useState<CapiCard[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [mostrouVerso, setMostrouVerso] = useState(false)
  const [previa, setPrevia] = useState<Record<string, number>>({})
  const [revisados, setRevisados] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    if (!identidade) return
    try {
      // Vindo do fim de uma sessão, garante que o deck daquela SP existe.
      // É idempotente: reabrir não duplica nem reinicia agendamento.
      if (sessaoId) await client.gerarDeck(sessaoId, identidade.id)
      setFila(await client.cardsDevidos(identidade.id))
      setIdx(0)
      setMostrouVerso(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao abrir o deck')
    }
  }, [sessaoId, identidade])

  useEffect(() => {
    carregar()
  }, [carregar])

  const atual = fila?.[idx]

  // Prévia dos quatro intervalos deste card, para os botões dizerem a verdade.
  useEffect(() => {
    if (!atual || !mostrouVerso) return
    let vivo = true
    client
      .previaIntervalos(atual.card_id)
      .then((p) => vivo && setPrevia(p))
      .catch(() => vivo && setPrevia({}))
    return () => {
      vivo = false
    }
  }, [atual, mostrouVerso])

  async function responder(nota: NotaCard) {
    if (!atual || ocupado) return
    setOcupado(true)
    try {
      await client.revisarCard(atual.card_id, nota)
      setRevisados((n) => n + 1)
      setMostrouVerso(false)
      setPrevia({})
      setIdx((i) => i + 1)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar a revisão')
    } finally {
      setOcupado(false)
    }
  }

  if (erro) {
    return (
      <div className="max-w-md mx-auto p-5">
        <ErrorBanner message={erro} />
        <Btn variant="secondary" className="mt-4 w-full" onClick={() => navigate('/')}>
          Voltar
        </Btn>
      </div>
    )
  }
  if (!fila) return <Spinner />

  const acabou = idx >= fila.length

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="bg-blue text-white px-4 py-3">
        <div className="font-serif text-base font-bold">Capi-Cards</div>
        <div className="text-xs opacity-85">
          {acabou ? 'Revisão espaçada' : `Card ${idx + 1} de ${fila.length}`}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-md w-full mx-auto flex flex-col">
        {acabou ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-blueLight ring-4 ring-blueAcc/20" />
            <div className="font-serif text-lg font-bold text-text">
              {revisados > 0 ? 'Revisão concluída' : 'Nada para revisar hoje'}
            </div>
            <p className="text-sm text-textSec max-w-xs">
              {revisados > 0
                ? `${revisados} ${revisados === 1 ? 'card revisado' : 'cards revisados'}. Consolida-se o conteúdo — os próximos voltam no tempo certo.`
                : 'Seus cards estão em dia. Eles reaparecem conforme o intervalo de cada um.'}
            </p>
            <Btn variant="secondary" className="mt-2" onClick={() => navigate('/')}>
              Voltar ao início
            </Btn>
          </div>
        ) : (
          atual && (
            <>
              <Card className="p-6 min-h-[160px] flex items-center justify-center text-center">
                {mostrouVerso ? (
                  <div className="text-left w-full">
                    <div className="font-semibold text-text mb-3">{atual.verso.resposta}</div>
                    {atual.verso.justificativa && (
                      <div className="text-sm text-textSec leading-relaxed border-t border-borderLight pt-3">
                        {atual.verso.justificativa}
                      </div>
                    )}
                    {atual.verso.referencia && (
                      <div className="text-xs text-textMuted mt-3">{atual.verso.referencia}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-base leading-relaxed">
                    {atual.texto_base && (
                      <p className="text-sm text-textSec mb-3">{atual.texto_base}</p>
                    )}
                    {atual.frente}
                  </div>
                )}
              </Card>

              <div className="flex gap-1.5 flex-wrap mt-3">
                <span className="text-[10px] font-semibold bg-blueLight text-blue px-2 py-0.5 rounded-full">
                  {atual.tags.fase}ª fase
                </span>
                {atual.tags.sp && (
                  <span className="text-[10px] font-semibold bg-blueLight text-blue px-2 py-0.5 rounded-full">
                    {rotuloSP(atual.tags.sp)}
                  </span>
                )}
                <span className="text-[10px] font-semibold bg-blueLight text-blue px-2 py-0.5 rounded-full">
                  {atual.status_card}
                </span>
              </div>

              {mostrouVerso ? (
                <div className="mt-5">
                  <div className="text-xs text-textMuted text-center font-medium mb-2">
                    Como foi sua memória?
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {NOTAS.map((n) => (
                      <button
                        key={n.nota}
                        onClick={() => responder(n.nota)}
                        disabled={ocupado}
                        className={`rounded-lg border-2 ${n.borda} ${n.fundo} px-1 py-3 flex flex-col items-center gap-0.5 min-h-[56px] disabled:opacity-50`}
                      >
                        <span className={`text-xs font-bold ${n.cor}`}>{n.label}</span>
                        <span className="text-[10px] text-textSec">{dias(previa[String(n.nota)])}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Btn className="w-full mt-5 py-4" onClick={() => setMostrouVerso(true)}>
                  Mostrar resposta
                </Btn>
              )}

              {!atual.verso.referencia && mostrouVerso && (
                <p className="text-[10px] text-textMuted text-center mt-4">
                  Card derivado das questões da SP, elaboradas pela coordenação do curso.
                </p>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}
