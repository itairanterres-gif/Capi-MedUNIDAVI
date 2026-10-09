import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { client } from '../../lib/client'
import type { ItemAluno, LinhaDistribuicao, Sessao } from '../../lib/types'

// Tela de projeção — legibilidade da última fileira é o critério dominante
// (§11): tipografia grande, alto contraste, pouquíssimo cromo, um item por
// tela. Sem persona (§9). Rota "de leitura": não tem controles — quem
// conduz é o professor na outra aba (ProfessorConduzir).
export function Projecao() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [item, setItem] = useState<ItemAluno | null>(null)
  const [distribuicao, setDistribuicao] = useState<LinhaDistribuicao[] | null>(null)
  const [conectados, setConectados] = useState(0)

  const carregar = useCallback(async () => {
    if (!sessaoId) return
    const s = await client.getSessao(sessaoId)
    setSessao(s)
    if (s.questao_atual) {
      const it = await client.verItem(s.questao_atual, 'projecao')
      setItem(it)
      if (it.estado === 'travada' || it.estado === 'discutida') {
        setDistribuicao(await client.distribuicao(s.questao_atual))
      } else {
        setDistribuicao(null)
      }
    } else {
      setItem(null)
      setConectados(await client.contagemParticipantes(sessaoId))
    }
  }, [sessaoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!sessaoId) return
    return client.subscribeSessao(sessaoId, carregar)
  }, [sessaoId, carregar])

  // Enquanto aguarda, o contador de conectados precisa de polling (não muda
  // via Realtime de sessoes/sessao_questoes — participante não dispara isso).
  useEffect(() => {
    if (!sessaoId || sessao?.status !== 'aberta') return
    const id = setInterval(async () => setConectados(await client.contagemParticipantes(sessaoId)), 2000)
    return () => clearInterval(id)
  }, [sessaoId, sessao?.status])

  if (!sessao) {
    return <div className="min-h-screen bg-blueDark" />
  }

  // ---------- Aguardando: código gigante ----------
  if (sessao.status !== 'em_andamento' || !item) {
    return (
      <div className="min-h-screen bg-blueDark text-white flex flex-col items-center justify-center gap-10 p-10">
        <div className="text-2xl font-medium text-blueAcc tracking-wide uppercase">{sessao.titulo}</div>
        <div className="text-[13vw] leading-none font-black tracking-[0.15em] font-mono">{sessao.codigo}</div>
        <div className="text-3xl text-white/80">
          {sessao.status === 'encerrada' ? 'Sessão encerrada' : `${conectados} conectado(s)`}
        </div>
      </div>
    )
  }

  // ---------- Item aberto: sem gabarito ----------
  if (item.estado === 'aberta') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-12 gap-8">
        {item.texto_base && (
          <p className="text-3xl leading-snug text-text max-w-5xl">{item.texto_base}</p>
        )}
        <p className="text-4xl font-bold leading-tight text-text max-w-5xl">{item.enunciado}</p>
        <div className="flex-1 flex flex-col justify-center gap-5 max-w-5xl">
          {[...item.alternativas].sort((a, b) => a.letra.localeCompare(b.letra)).map((alt) => (
            <div key={alt.letra} className="flex items-center gap-6 border-2 border-border rounded-lg px-8 py-6">
              <div className="h-14 w-14 rounded-full bg-blueLight text-blue flex items-center justify-center text-3xl font-black shrink-0">
                {alt.letra}
              </div>
              <div className="text-3xl text-text">{alt.texto}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---------- Travada: distribuição ----------
  const total = distribuicao?.reduce((acc, d) => acc + d.contagem, 0) ?? 0
  return (
    <div className="min-h-screen bg-white flex flex-col p-12 gap-8">
      <p className="text-3xl font-bold leading-tight text-text max-w-5xl">{item.enunciado}</p>
      <div className="flex-1 flex flex-col justify-center gap-5 max-w-5xl">
        {[...(distribuicao ?? [])].sort((a, b) => a.letra.localeCompare(b.letra)).map((d) => {
          const pct = total > 0 ? Math.round((d.contagem / total) * 100) : 0
          return (
            <div
              key={d.letra}
              className={`relative overflow-hidden rounded-lg border-2 px-8 py-6 ${
                d.correta ? 'border-green' : 'border-border'
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${d.correta ? 'bg-greenLight' : 'bg-bg'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center gap-6">
                <div
                  className={`h-14 w-14 rounded-full flex items-center justify-center text-3xl font-black shrink-0 ${
                    d.correta ? 'bg-green text-white' : 'bg-blueLight text-blue'
                  }`}
                >
                  {d.letra}
                </div>
                <div className="text-3xl text-text flex-1">{d.texto}</div>
                <div className="text-4xl font-black text-text font-mono">{pct}%</div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-2xl text-textSec text-center">{total} resposta(s)</p>
    </div>
  )
}
