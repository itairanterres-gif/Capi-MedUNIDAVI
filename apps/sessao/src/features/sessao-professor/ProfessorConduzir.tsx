import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Btn, ErrorBanner, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import { rotuloSP, rotuloUC } from '../../lib/rotulos'
import type { ContagemRespostas, ItemAluno, LinhaDistribuicao, Sessao, SessaoQuestao } from '../../lib/types'

// Conduzir E projetar na MESMA tela (decisão do coordenador, 30/07): um
// professor sozinho não deve precisar de dois aparelhos. Esta tela é legível
// de longe (serve no projetor) e traz os controles num rodapé.
//
// SEGURANÇA: por construção esta tela só mostra AGREGADOS — a questão, o
// "N de M responderam", a distribuição por alternativa. Nunca a resposta de um
// aluno nominal. O dado individual vive só na tela de RESULTADO
// (/professor/:id/resultado), separada, marcada como "não projetar", aberta
// depois da aula. Então projetar esta tela é seguro.
export function ProfessorConduzir() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [itens, setItens] = useState<SessaoQuestao[]>([])
  const [item, setItem] = useState<ItemAluno | null>(null)
  const [contagem, setContagem] = useState<ContagemRespostas | null>(null)
  const [distribuicao, setDistribuicao] = useState<LinhaDistribuicao[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [acao, setAcao] = useState(false)
  const [validada, setValidada] = useState<boolean | null>(null)

  const carregar = useCallback(async () => {
    if (!sessaoId) return
    const s = await client.getSessao(sessaoId)
    setSessao(s)
    const its = await client.listarItens(sessaoId)
    setItens(its)
    if (s.questao_atual) {
      const it = await client.verItem(s.questao_atual, identidade?.id ?? '')
      setItem((anterior) => {
        if (anterior?.sessao_questao_id !== it.sessao_questao_id) setValidada(null)
        return it
      })
      if (it.estado === 'aberta') {
        setContagem(await client.contagemRespostas(s.questao_atual))
        setDistribuicao(null)
      } else if (it.estado === 'travada' || it.estado === 'discutida') {
        setDistribuicao(await client.distribuicao(s.questao_atual))
      }
    } else {
      setItem(null)
    }
  }, [sessaoId, identidade])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!sessaoId) return
    return client.subscribeSessao(sessaoId, carregar)
  }, [sessaoId, carregar])

  // Polling leve da contagem enquanto o item está aberto — decide quando travar.
  useEffect(() => {
    if (!sessao?.questao_atual || item?.estado !== 'aberta') return
    const id = setInterval(async () => {
      setContagem(await client.contagemRespostas(sessao.questao_atual!))
    }, 1500)
    return () => clearInterval(id)
  }, [sessao?.questao_atual, item?.estado])

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

  async function validar(v: boolean) {
    await acaoComErro(async () => {
      const qid = itens.find((i) => i.id === sessao?.questao_atual)?.questao_id
      if (!qid) return
      await client.validarQuestao(qid, v)
      setValidada(v)
    })
  }

  if (!sessao) return <Spinner />

  const totalItens = itens.length
  const posicao = itens.filter((i) => i.estado !== 'aguardando').length
  const temProximo = itens.some((i) => i.estado === 'aguardando')
  const travada = item?.estado === 'travada' || item?.estado === 'discutida'
  const enderecoAluno = window.location.host

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Cabeçalho da sala — código legível, orientação da questão */}
      <div className="bg-blue text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-semibold truncate">{sessao.titulo}</div>
          <div className="text-xs text-white/75 truncate">
            {rotuloUC(sessao.uc_slug)} · {rotuloSP(sessao.sp_referencia)} · Turma {sessao.turma}
            {sessao.status === 'em_andamento' && ` · Questão ${posicao} de ${totalItens}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-mono font-black tracking-[0.25em] leading-none">{sessao.codigo}</div>
          <button
            className="text-[11px] text-white/70 underline"
            onClick={() =>
              window.open(
                `${window.location.origin}${window.location.pathname}#/projecao/${sessao.id}`,
                '_blank'
              )
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

      {/* ---------- Aguardando início ---------- */}
      {sessao.status === 'aberta' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 p-10">
          <Badge tone="amber">Aguardando a turma entrar</Badge>
          <p className="text-2xl text-textSec max-w-2xl">
            Acesse <strong className="text-text">{enderecoAluno}</strong> e entre com o código
          </p>
          <div className="text-[12vw] leading-none font-mono font-black text-blue tracking-[0.15em]">
            {sessao.codigo}
          </div>
          <p className="text-xl text-textSec">{contagem?.conectados ?? 0} conectado(s)</p>
          <Btn
            className="text-xl px-8 py-4 mt-2"
            onClick={() => acaoComErro(async () => void (await client.avancar(sessao.id)))}
            disabled={acao}
          >
            Iniciar — abrir questão 1
          </Btn>
        </div>
      )}

      {/* ---------- Questão em andamento ---------- */}
      {sessao.status === 'em_andamento' && item && (
        <div className="flex-1 flex flex-col p-6 md:p-10 gap-5 max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between">
            <Badge tone={travada ? 'blue' : 'green'}>
              {travada ? 'Travada — discutindo' : 'Recebendo respostas'}
            </Badge>
            {!travada && contagem && (
              <span className="text-xl font-semibold text-textSec">
                {contagem.respostas} de {contagem.conectados} responderam
              </span>
            )}
            {travada && distribuicao && (
              <span className="text-xl font-semibold text-textSec">
                {distribuicao.reduce((a, d) => a + d.contagem, 0)} resposta(s)
              </span>
            )}
          </div>

          {item.texto_base && (
            <p className="text-2xl leading-snug text-text whitespace-pre-wrap">{item.texto_base}</p>
          )}
          <p className="text-3xl font-bold leading-tight text-text">{item.enunciado}</p>

          <div className="flex-1 flex flex-col justify-center gap-3">
            {[...item.alternativas]
              .sort((a, b) => a.letra.localeCompare(b.letra))
              .map((alt) => {
                const linha = distribuicao?.find((d) => d.letra === alt.letra)
                const correta = travada && item.gabarito === alt.letra
                const pct =
                  travada && distribuicao
                    ? Math.round(
                        (100 * (linha?.contagem ?? 0)) /
                          Math.max(1, distribuicao.reduce((a, d) => a + d.contagem, 0))
                      )
                    : null
                const just = item.justificativas?.[alt.letra]
                return (
                  <div
                    key={alt.letra}
                    className={`relative overflow-hidden rounded-lg border-2 px-6 py-4 ${
                      correta ? 'border-green' : 'border-border'
                    }`}
                  >
                    {pct !== null && (
                      <div
                        className={`absolute inset-y-0 left-0 ${correta ? 'bg-greenLight' : 'bg-blueLight/50'}`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative">
                      <div className="flex items-center gap-4">
                        <span
                          className={`h-11 w-11 rounded-full flex items-center justify-center text-xl font-black shrink-0 ${
                            correta ? 'bg-green text-white' : 'bg-blueLight text-blue'
                          }`}
                        >
                          {alt.letra}
                        </span>
                        <span className="flex-1 text-xl text-text">{alt.texto}</span>
                        {pct !== null && (
                          <span className="text-2xl font-black font-mono text-text shrink-0">{pct}%</span>
                        )}
                      </div>
                      {travada && just && (
                        <div className="text-sm text-textSec mt-2 leading-relaxed">{just}</div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ---------- Encerrada ---------- */}
      {sessao.status === 'encerrada' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-10">
          <Badge tone="green">Sessão encerrada</Badge>
          <p className="text-2xl text-textSec">
            {totalItens} questões percorridas com a turma {sessao.turma}.
          </p>
          <div className="flex gap-3 mt-2">
            <Btn variant="primary" onClick={() => navigate(`/professor/${sessao.id}/resultado`)}>
              Ver resultado da turma (privado)
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('/professor')}>
              Minhas sessões
            </Btn>
          </div>
        </div>
      )}

      {/* ---------- Rodapé de controle (fica na tela, é seguro projetar) ---------- */}
      {sessao.status === 'em_andamento' && item && (
        <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-3 flex items-center gap-3 flex-wrap">
          {!travada ? (
            <Btn
              variant="terra"
              className="text-lg px-6 py-3"
              onClick={() =>
                acaoComErro(async () => {
                  if (sessao.questao_atual) await client.travar(sessao.questao_atual)
                })
              }
              disabled={acao}
            >
              Travar questão
            </Btn>
          ) : temProximo ? (
            <Btn
              className="text-lg px-6 py-3"
              onClick={() => acaoComErro(async () => void (await client.avancar(sessao.id)))}
              disabled={acao}
            >
              Próxima questão →
            </Btn>
          ) : (
            <Btn
              variant="success"
              className="text-lg px-6 py-3"
              onClick={() => acaoComErro(async () => void (await client.encerrarSessao(sessao.id)))}
              disabled={acao}
            >
              Encerrar sessão
            </Btn>
          )}

          {/* Validação em aula — só com o item travado (gabarito já revelado) */}
          {travada && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-textSec">Esta questão:</span>
              <button
                onClick={() => validar(true)}
                disabled={acao}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
                  validada === true ? 'border-green bg-greenLight text-green' : 'border-border text-textSec'
                }`}
              >
                ✓ validada
              </button>
              <button
                onClick={() => validar(false)}
                disabled={acao}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
                  validada === false ? 'border-terra bg-terraLight text-terra' : 'border-border text-textSec'
                }`}
              >
                ✕ não validada
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
