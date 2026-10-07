import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, Spinner } from '../../ui/kit'
import { enqueteClient } from '../../lib/enqueteClient'
import { useAuth } from '../auth/AuthContext'
import type { Enquete, PerguntaParticipante } from '../../lib/types'

// Igual a AlunoSessao, sem nada de "você acertou" — é opinião, não prova. A
// mensagem de rodapé muda de "não compõe nota" (que pressupõe avaliação)
// para "resposta anônima na tela" (o que realmente importa aqui: ninguém
// vê quem votou o quê).
export function EnqueteVotar() {
  const { enqueteId } = useParams<{ enqueteId: string }>()
  const navigate = useNavigate()
  const { identidade } = useAuth()

  const [enquete, setEnquete] = useState<Enquete | null>(null)
  const [pergunta, setPergunta] = useState<PerguntaParticipante | null>(null)
  const [selecionada, setSelecionada] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!enqueteId || !identidade) return
    const e = await enqueteClient.getEnquete(enqueteId)
    setEnquete(e)
    if (e.pergunta_atual) {
      const p = await enqueteClient.verPergunta(e.pergunta_atual, identidade.id)
      setPergunta(p)
      setSelecionada(p.minha_resposta ?? null)
    } else {
      setPergunta(null)
    }
  }, [enqueteId, identidade])

  useEffect(() => {
    if (!identidade) navigate('/enquete/entrar')
  }, [identidade, navigate])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!enqueteId) return
    return enqueteClient.subscribeEnquete(enqueteId, carregar)
  }, [enqueteId, carregar])

  if (!identidade) return null
  if (!enquete) return <Spinner />

  async function confirmar() {
    if (!pergunta || selecionada === null || !identidade) return
    setEnviando(true)
    setErro(null)
    try {
      await enqueteClient.votar(pergunta.pergunta_id, identidade.id, selecionada)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao votar')
    } finally {
      setEnviando(false)
    }
  }

  const jaVotou = pergunta?.minha_resposta !== undefined
  const travada = pergunta?.estado === 'travada' || pergunta?.estado === 'discutida'

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-terra text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">{enquete.titulo}</span>
        <span className="text-xs opacity-80">{identidade.nome}</span>
      </div>

      <div className="bg-amberLight text-amber text-xs text-center py-2 px-4 font-medium">
        Sem certo ou errado — sua resposta some na contagem da turma, ninguém vê quem votou o quê.
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {enquete.status !== 'em_andamento' || !pergunta ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <Badge tone={enquete.status === 'encerrada' ? 'green' : 'amber'}>
              {enquete.status === 'encerrada' ? 'Enquete encerrada' : 'Aguardando o professor iniciar'}
            </Badge>
            <p className="text-textSec text-sm max-w-xs">
              {enquete.status === 'encerrada'
                ? 'Obrigado por participar!'
                : 'Fique de olho na projeção — a primeira pergunta vai aparecer aqui automaticamente.'}
            </p>
          </div>
        ) : (
          <>
            {pergunta.contexto && <p className="text-text leading-relaxed">{pergunta.contexto}</p>}
            <p className="font-semibold text-text text-lg leading-snug">{pergunta.texto}</p>

            <div className="flex flex-col gap-3 mt-2">
              {pergunta.opcoes.map((opcao, i) => {
                const marcada = selecionada === i
                let estilo = 'border-border'
                if (travada && jaVotou && pergunta.minha_resposta === i) estilo = 'border-terra bg-terraLight'
                else if (marcada) estilo = 'border-terra bg-terraLight'

                return (
                  <button
                    key={i}
                    disabled={travada || jaVotou}
                    onClick={() => setSelecionada(i)}
                    className={`text-left rounded-lg border-2 px-4 py-4 min-h-[44px] flex items-start gap-3 transition-colors ${estilo} disabled:cursor-default`}
                  >
                    <span className="h-8 w-8 rounded-full bg-white border border-border flex items-center justify-center font-bold text-sm shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-text">{opcao}</span>
                  </button>
                )
              })}
            </div>

            {erro && <ErrorBanner message={erro} />}

            {!travada && !jaVotou && (
              <Btn
                variant="terra"
                onClick={confirmar}
                disabled={selecionada === null || enviando}
                className="w-full text-lg py-4 mt-2"
              >
                {enviando ? 'Enviando…' : 'Confirmar voto'}
              </Btn>
            )}

            {!travada && jaVotou && (
              <Card className="p-4 text-center text-textSec text-sm">
                Voto registrado. Aguardando o professor travar a pergunta.
              </Card>
            )}

            {travada && (
              <Card className="p-4 text-center font-semibold text-textSec">Resultado na projeção.</Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
