import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Btn, ErrorBanner, Spinner } from '../../ui/kit'
import { QR } from '../../ui/QR'
import { enqueteClient } from '../../lib/enqueteClient'
import type { ContagemRespostas, Enquete, EnquetePergunta, LinhaDistribuicaoEnquete } from '../../lib/types'

// Conduzir E projetar na mesma tela, mesma decisão de ProfessorConduzir
// (30/07): um professor sozinho não deve precisar de dois aparelhos. Sem
// gabarito em lugar nenhum — nem verde/vermelho, nem "correta".
export function ProfessorConduzirEnquete() {
  const { enqueteId } = useParams<{ enqueteId: string }>()
  const navigate = useNavigate()
  const [enquete, setEnquete] = useState<Enquete | null>(null)
  const [perguntas, setPerguntas] = useState<EnquetePergunta[]>([])
  const [perguntaAtual, setPerguntaAtual] = useState<EnquetePergunta | null>(null)
  const [contagem, setContagem] = useState<ContagemRespostas | null>(null)
  const [distribuicao, setDistribuicao] = useState<LinhaDistribuicaoEnquete[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [acao, setAcao] = useState(false)

  const carregar = useCallback(async () => {
    if (!enqueteId) return
    const e = await enqueteClient.getEnquete(enqueteId)
    setEnquete(e)
    const its = await enqueteClient.listarPerguntas(enqueteId)
    setPerguntas(its)
    if (e.pergunta_atual) {
      const p = its.find((x) => x.id === e.pergunta_atual) ?? null
      setPerguntaAtual(p)
      if (p?.estado === 'aberta') {
        setContagem(await enqueteClient.contagemVotos(e.pergunta_atual))
        setDistribuicao(null)
      } else if (p?.estado === 'travada' || p?.estado === 'discutida') {
        setDistribuicao(await enqueteClient.distribuicao(e.pergunta_atual))
      }
    } else {
      setPerguntaAtual(null)
    }
  }, [enqueteId])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!enqueteId) return
    return enqueteClient.subscribeEnquete(enqueteId, carregar)
  }, [enqueteId, carregar])

  useEffect(() => {
    if (!enquete?.pergunta_atual || perguntaAtual?.estado !== 'aberta') return
    const id = setInterval(async () => {
      setContagem(await enqueteClient.contagemVotos(enquete.pergunta_atual!))
    }, 1500)
    return () => clearInterval(id)
  }, [enquete?.pergunta_atual, perguntaAtual?.estado])

  async function acaoComErro(fn: () => Promise<void>) {
    setErro(null)
    setAcao(true)
    try {
      await fn()
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    } finally {
      setAcao(false)
    }
  }

  if (!enquete) return <Spinner />

  const totalItens = perguntas.length
  const posicao = perguntas.filter((p) => p.estado !== 'aguardando').length
  const temProxima = perguntas.some((p) => p.estado === 'aguardando')
  const travada = perguntaAtual?.estado === 'travada' || perguntaAtual?.estado === 'discutida'
  const linkEntrada = `${window.location.origin}${window.location.pathname}#/enquete/entrar?c=${enquete.codigo}`

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="bg-terra text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-semibold truncate">{enquete.titulo}</div>
          <div className="text-xs text-white/75 truncate">
            {enquete.turma ? `Turma ${enquete.turma}` : 'Enquete aberta'}
            {enquete.status === 'em_andamento' && ` · Pergunta ${posicao} de ${totalItens}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-mono font-black tracking-[0.25em] leading-none">{enquete.codigo}</div>
          <button
            className="text-[11px] text-white/70 underline"
            onClick={() =>
              window.open(`${window.location.origin}${window.location.pathname}#/projecao-enquete/${enquete.id}`, '_blank')
            }
          >
            abrir em 2ª tela (sem botões) ↗
          </button>
        </div>
      </div>

      {erro && (
        <div className="px-6 pt-4">
          <ErrorBanner message={erro} />
        </div>
      )}

      {enquete.status === 'aberta' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 p-10">
          <Badge tone="amber">Aguardando a turma entrar</Badge>
          <p className="text-2xl text-textSec max-w-2xl">
            Acesse <strong className="text-text">{window.location.host}</strong> e entre com o código,
            ou escaneie o QR
          </p>
          <div className="text-[12vw] leading-none font-mono font-black text-terra tracking-[0.15em]">
            {enquete.codigo}
          </div>
          <div className="border border-border rounded-lg p-3 bg-white">
            <QR texto={linkEntrada} lado={180} cor="#C4622D" />
          </div>
          <p className="text-xl text-textSec">{contagem?.conectados ?? 0} conectado(s)</p>
          <Btn
            variant="terra"
            className="text-xl px-8 py-4 mt-2"
            onClick={() => acaoComErro(async () => void (await enqueteClient.avancar(enquete.id)))}
            disabled={acao}
          >
            Iniciar — abrir pergunta 1
          </Btn>
        </div>
      )}

      {enquete.status === 'em_andamento' && perguntaAtual && (
        <div className="flex-1 flex flex-col p-6 md:p-10 gap-5 max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between">
            <Badge tone={travada ? 'blue' : 'green'}>{travada ? 'Travada — discutindo' : 'Recebendo votos'}</Badge>
            {!travada && contagem && (
              <span className="text-xl font-semibold text-textSec">
                {contagem.respostas} de {contagem.conectados} votaram
              </span>
            )}
            {travada && distribuicao && (
              <span className="text-xl font-semibold text-textSec">
                {distribuicao.reduce((a, d) => a + d.contagem, 0)} voto(s)
              </span>
            )}
          </div>

          {perguntaAtual.contexto && (
            <p className="text-2xl leading-snug text-text whitespace-pre-wrap">{perguntaAtual.contexto}</p>
          )}
          <p className="text-3xl font-bold leading-tight text-text">{perguntaAtual.texto}</p>

          <div className="flex-1 flex flex-col justify-center gap-3">
            {perguntaAtual.opcoes.map((opcao, i) => {
              const linha = distribuicao?.find((d) => d.posicao === i + 1)
              const pct =
                travada && distribuicao
                  ? Math.round((100 * (linha?.contagem ?? 0)) / Math.max(1, distribuicao.reduce((a, d) => a + d.contagem, 0)))
                  : null
              return (
                <div key={i} className="relative overflow-hidden rounded-lg border-2 border-border px-6 py-4">
                  {pct !== null && (
                    <div className="absolute inset-y-0 left-0 bg-terraLight/60" style={{ width: `${pct}%` }} />
                  )}
                  <div className="relative flex items-center gap-4">
                    <span className="h-11 w-11 rounded-full bg-terraLight text-terra flex items-center justify-center text-xl font-black shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-xl text-text">{opcao}</span>
                    {pct !== null && <span className="text-2xl font-black font-mono text-text shrink-0">{pct}%</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {enquete.status === 'encerrada' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-10">
          <Badge tone="green">Enquete encerrada</Badge>
          <p className="text-2xl text-textSec">{totalItens} pergunta(s) percorridas com a turma.</p>
          <Btn variant="secondary" onClick={() => navigate('/professor/enquetes')}>
            Minhas enquetes
          </Btn>
        </div>
      )}

      {enquete.status === 'em_andamento' && perguntaAtual && (
        <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-3 flex items-center gap-3 flex-wrap">
          {!travada ? (
            <Btn
              variant="terra"
              className="text-lg px-6 py-3"
              onClick={() =>
                acaoComErro(async () => {
                  if (enquete.pergunta_atual) await enqueteClient.travar(enquete.pergunta_atual)
                })
              }
              disabled={acao}
            >
              Travar pergunta
            </Btn>
          ) : temProxima ? (
            <Btn
              className="text-lg px-6 py-3"
              onClick={() => acaoComErro(async () => void (await enqueteClient.avancar(enquete.id)))}
              disabled={acao}
            >
              Próxima pergunta →
            </Btn>
          ) : (
            <Btn
              variant="success"
              className="text-lg px-6 py-3"
              onClick={() => acaoComErro(async () => void (await enqueteClient.encerrarEnquete(enquete.id)))}
              disabled={acao}
            >
              Encerrar enquete
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}
