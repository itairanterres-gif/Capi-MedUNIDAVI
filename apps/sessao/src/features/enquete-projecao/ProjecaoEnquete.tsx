import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QR } from '../../ui/QR'
import { enqueteClient } from '../../lib/enqueteClient'
import type { Enquete, LinhaDistribuicaoEnquete, PerguntaParticipante } from '../../lib/types'

// Igual a Projecao: tela de leitura, sem controles, legível da última
// fileira. Nenhuma cor marca "opção certa" — aqui não existe.
export function ProjecaoEnquete() {
  const { enqueteId } = useParams<{ enqueteId: string }>()
  const [enquete, setEnquete] = useState<Enquete | null>(null)
  const [pergunta, setPergunta] = useState<PerguntaParticipante | null>(null)
  const [distribuicao, setDistribuicao] = useState<LinhaDistribuicaoEnquete[] | null>(null)
  const [conectados, setConectados] = useState(0)

  const carregar = useCallback(async () => {
    if (!enqueteId) return
    const e = await enqueteClient.getEnquete(enqueteId)
    setEnquete(e)
    if (e.pergunta_atual) {
      const p = await enqueteClient.verPergunta(e.pergunta_atual, 'projecao')
      setPergunta(p)
      if (p.estado === 'travada' || p.estado === 'discutida') {
        setDistribuicao(await enqueteClient.distribuicao(e.pergunta_atual))
      } else {
        setDistribuicao(null)
      }
    } else {
      setPergunta(null)
      setConectados(await enqueteClient.contagemParticipantes(enqueteId))
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
    if (!enqueteId || enquete?.status !== 'aberta') return
    const id = setInterval(async () => setConectados(await enqueteClient.contagemParticipantes(enqueteId)), 2000)
    return () => clearInterval(id)
  }, [enqueteId, enquete?.status])

  if (!enquete) {
    return <div className="min-h-screen bg-blueDark" />
  }

  const linkEntrada = `${window.location.origin}${window.location.pathname}#/enquete/entrar?c=${enquete.codigo}`

  if (enquete.status !== 'em_andamento' || !pergunta) {
    return (
      <div className="min-h-screen bg-blueDark text-white flex flex-col items-center justify-center gap-8 p-10">
        <div className="text-2xl font-medium text-blueAcc tracking-wide uppercase">{enquete.titulo}</div>
        <div className="text-[11vw] leading-none font-black tracking-[0.15em] font-mono">{enquete.codigo}</div>
        {enquete.status !== 'encerrada' && (
          <div className="bg-white p-3 rounded-lg">
            <QR texto={linkEntrada} lado={160} cor="#012D65" />
          </div>
        )}
        <div className="text-3xl text-white/80">
          {enquete.status === 'encerrada' ? 'Enquete encerrada' : `${conectados} conectado(s)`}
        </div>
      </div>
    )
  }

  if (pergunta.estado === 'aberta') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-12 gap-8">
        {pergunta.contexto && <p className="text-3xl leading-snug text-text max-w-5xl">{pergunta.contexto}</p>}
        <p className="text-4xl font-bold leading-tight text-text max-w-5xl">{pergunta.texto}</p>
        <div className="flex-1 flex flex-col justify-center gap-5 max-w-5xl">
          {pergunta.opcoes.map((opcao, i) => (
            <div key={i} className="flex items-center gap-6 border-2 border-border rounded-lg px-8 py-6">
              <div className="h-14 w-14 rounded-full bg-terraLight text-terra flex items-center justify-center text-3xl font-black shrink-0">
                {i + 1}
              </div>
              <div className="text-3xl text-text">{opcao}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const total = distribuicao?.reduce((acc, d) => acc + d.contagem, 0) ?? 0
  return (
    <div className="min-h-screen bg-white flex flex-col p-12 gap-8">
      <p className="text-3xl font-bold leading-tight text-text max-w-5xl">{pergunta.texto}</p>
      <div className="flex-1 flex flex-col justify-center gap-5 max-w-5xl">
        {(distribuicao ?? []).map((d) => {
          const pct = total > 0 ? Math.round((d.contagem / total) * 100) : 0
          return (
            <div key={d.posicao} className="relative overflow-hidden rounded-lg border-2 border-border px-8 py-6">
              <div className="absolute inset-y-0 left-0 bg-terraLight/50" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center gap-6">
                <div className="h-14 w-14 rounded-full bg-terraLight text-terra flex items-center justify-center text-3xl font-black shrink-0">
                  {d.posicao}
                </div>
                <div className="text-3xl text-text flex-1">{d.texto}</div>
                <div className="text-4xl font-black text-text font-mono">{pct}%</div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-2xl text-textSec text-center">{total} voto(s)</p>
    </div>
  )
}
