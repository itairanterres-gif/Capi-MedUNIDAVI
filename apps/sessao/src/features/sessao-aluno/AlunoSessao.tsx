import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import type { Letra, MeuResultado, Sessao, ItemAluno } from '../../lib/types'

// Tela do aluno — polegar, uma mão, celular (§11). Alvos de toque
// generosos. Mensagem de "não compõe nota" é requisito de mecânica (§7),
// não enfeite: mantém o dado diagnóstico limpo.
export function AlunoSessao() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const navigate = useNavigate()
  const { identidade } = useAuth()

  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [item, setItem] = useState<ItemAluno | null>(null)
  const [selecionada, setSelecionada] = useState<Letra | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [meu, setMeu] = useState<MeuResultado | null>(null)

  const carregar = useCallback(async () => {
    if (!sessaoId || !identidade) return
    const s = await client.getSessao(sessaoId)
    setSessao(s)
    if (s.questao_atual) {
      const it = await client.verItem(s.questao_atual, identidade.id)
      setItem(it)
      setSelecionada(it.minha_resposta ?? null)
    } else {
      setItem(null)
    }
    // Sessão encerrada: o aluno recebe o próprio desempenho e a média da
    // turma (número agregado — nenhum colega é identificável).
    if (s.status === 'encerrada' && identidade) {
      try {
        setMeu(await client.meuResultado(sessaoId, identidade.id))
      } catch {
        setMeu(null)
      }
    }
  }, [sessaoId, identidade])

  useEffect(() => {
    if (!identidade) navigate('/aluno')
  }, [identidade, navigate])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!sessaoId) return
    return client.subscribeSessao(sessaoId, carregar)
  }, [sessaoId, carregar])

  if (!identidade) return null
  if (!sessao) return <Spinner />

  async function confirmar() {
    if (!item || !selecionada || !identidade) return
    setEnviando(true)
    setErro(null)
    try {
      await client.responder(item.sessao_questao_id, identidade.id, selecionada)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao responder')
    } finally {
      setEnviando(false)
    }
  }

  const jaEnviou = !!item?.minha_resposta
  const travada = item?.estado === 'travada' || item?.estado === 'discutida'

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blue text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">{sessao.titulo}</span>
        <span className="text-xs opacity-80">{identidade.nome}</span>
      </div>

      <div className="bg-amberLight text-amber text-xs text-center py-2 px-4 font-medium">
        Atividade formativa — não compõe nota. Você só vê o seu próprio desempenho.
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {sessao.status !== 'em_andamento' || !item ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <Badge tone={sessao.status === 'encerrada' ? 'green' : 'amber'}>
              {sessao.status === 'encerrada' ? 'Sessão encerrada' : 'Aguardando o professor iniciar'}
            </Badge>
            {sessao.status === 'encerrada' && meu ? (
              <div className="w-full max-w-xs flex flex-col gap-3">
                <Card className="p-5 text-center">
                  <div className="text-4xl font-bold text-green leading-none">
                    {meu.certas}/{meu.respondidas}
                  </div>
                  <div className="text-textSec text-sm mt-1">{meu.pct}% de acerto</div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm font-semibold text-text mb-2">Comparado à turma</div>
                  <div className="text-xs text-textSec mb-1">Você — {meu.pct}%</div>
                  <div className="h-5 rounded bg-greenLight overflow-hidden mb-2">
                    <div className="h-full bg-green/40" style={{ width: `${meu.pct}%` }} />
                  </div>
                  <div className="text-xs text-textSec mb-1">Média da turma — {meu.media_turma}%</div>
                  <div className="h-5 rounded bg-blueLight overflow-hidden">
                    <div className="h-full bg-blueAcc/40" style={{ width: `${meu.media_turma}%` }} />
                  </div>
                </Card>

                {meu.erradas.length > 0 && (
                  <Card className="p-4">
                    <div className="text-sm font-semibold text-text mb-1">O que revisar</div>
                    <div className="text-xs text-textSec mb-2">
                      {meu.erradas.length === 1 ? 'A questão que você errou:' : `As ${meu.erradas.length} questões que você errou:`}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {meu.erradas.map((e) => (
                        <span
                          key={e.sessao_questao_id}
                          className="text-xs font-bold px-2 py-0.5 rounded-full bg-redLight text-red"
                        >
                          Q{e.numero_origem ?? '?'}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-4 bg-blueLight border-blueAcc">
                  <div className="text-sm font-semibold text-blue mb-1">Liberado para você</div>
                  <p className="text-xs text-blue leading-relaxed mb-3">
                    As {meu.total_itens} questões desta SP, com gabarito e justificativas, e o seu
                    deck de Capi-Cards.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Btn className="w-full" onClick={() => navigate(`/aluno/${sessaoId}/cards`)}>
                      Abrir meus Capi-Cards
                    </Btn>
                    <Btn
                      variant="secondary"
                      className="w-full"
                      onClick={() => navigate(`/aluno/${sessaoId}/questoes`)}
                    >
                      Rever as questões da SP
                    </Btn>
                  </div>
                </Card>

                <p className="text-xs text-textMuted">
                  Você só vê o seu próprio desempenho. A média da turma é um número agregado —
                  nenhum colega é identificado.
                </p>
              </div>
            ) : (
              <p className="text-textSec text-sm max-w-xs">
                {sessao.status === 'encerrada'
                  ? 'Obrigado por participar! Carregando o seu desempenho…'
                  : 'Fique de olho na projeção — a primeira questão vai aparecer aqui automaticamente.'}
              </p>
            )}
          </div>
        ) : (
          <>
            {item.texto_base && (
              <p className="text-text leading-relaxed">{item.texto_base}</p>
            )}
            <p className="font-semibold text-text text-lg leading-snug">{item.enunciado}</p>

            <div className="flex flex-col gap-3 mt-2">
              {[...item.alternativas].sort((a, b) => a.letra.localeCompare(b.letra)).map((alt) => {
                const marcada = selecionada === alt.letra
                const eACorreta = travada && item.gabarito === alt.letra
                const eAMinhaErrada = travada && jaEnviou && item.minha_resposta === alt.letra && item.gabarito !== alt.letra

                let estilo = 'border-border'
                if (travada) {
                  if (eACorreta) estilo = 'border-green bg-greenLight'
                  else if (eAMinhaErrada) estilo = 'border-red bg-redLight'
                } else if (marcada) {
                  estilo = 'border-blue bg-blueLight'
                }

                return (
                  <button
                    key={alt.letra}
                    disabled={travada || jaEnviou}
                    onClick={() => setSelecionada(alt.letra)}
                    className={`text-left rounded-lg border-2 px-4 py-4 min-h-[44px] flex items-start gap-3 transition-colors ${estilo} disabled:cursor-default`}
                  >
                    <span className="h-8 w-8 rounded-full bg-white border border-border flex items-center justify-center font-bold text-sm shrink-0">
                      {alt.letra}
                    </span>
                    <span className="flex-1">
                      <span className="block text-text">{alt.texto}</span>
                      {travada && item.justificativas && (eACorreta || alt.letra === selecionada) && (
                        <span className="block text-xs text-textSec mt-2">
                          {item.justificativas[alt.letra]}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            {erro && <ErrorBanner message={erro} />}

            {!travada && !jaEnviou && (
              <Btn onClick={confirmar} disabled={!selecionada || enviando} className="w-full text-lg py-4 mt-2">
                {enviando ? 'Enviando…' : 'Confirmar resposta'}
              </Btn>
            )}

            {!travada && jaEnviou && (
              <Card className="p-4 text-center text-textSec text-sm">
                Resposta enviada. Aguardando o professor travar a questão.
              </Card>
            )}

            {travada && (
              <Card className={`p-4 text-center font-semibold ${item.acertei ? 'text-green' : 'text-red'}`}>
                {item.acertei ? 'Você acertou!' : `Você errou — a correta era ${item.gabarito}.`}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
