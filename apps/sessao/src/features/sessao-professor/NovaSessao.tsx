import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, PageHeader, Spinner } from '../../ui/kit'
import { client } from '../../lib/client'
import { SEMESTRE_VIGENTE } from '../../lib/semestre'
import { useAuth } from '../auth/AuthContext'
import { numeroSP, rotuloSP, rotuloSPCompleto, rotuloUC, tituloSP } from '../../lib/rotulos'
import type { Questao, Turma } from '../../lib/types'

// As turmas vinham daqui, fixas em T13/T14/T15 — o que impedia qualquer
// professor de outra fase de abrir sessão (a 7ª fase é a T13, a 4ª é a T16).
// Agora vêm da tabela `turmas`, por fase, mantida pela coordenação
// (migration 10 + tela /coordenacao).
const NIVEL_LABEL: Record<string, string> = { facil: 'Fácil', medio: 'Média', dificil: 'Difícil' }

// A sessão semanal é o conjunto JÁ ATRIBUÍDO de uma Situação-Problema
// (20 questões por SP). Por isso o fluxo é Fase → UC → SP, e as questões da
// SP entram todas, na ordem autoral (numero_origem). O docente pode desmarcar
// alguma pontualmente (questão com problema), mas não precisa montar nada.
export function NovaSessao() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [fase, setFase] = useState(4)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ucSlug, setUcSlug] = useState('')
  const [spRef, setSpRef] = useState('')
  const [removidas, setRemovidas] = useState<string[]>([])
  const [expandida, setExpandida] = useState<string | null>(null)
  const [tituloManual, setTituloManual] = useState('')
  const [turma, setTurma] = useState('')
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    setCarregando(true)
    client.listarBancoQuestoes({ fase }).then((qs) => {
      setQuestoes(qs)
      setCarregando(false)
    })
  }, [fase])

  // Turmas da fase escolhida, vindas do banco. Uma turma por fase, então na
  // prática isto pré-seleciona a turma certa e o docente não escolhe nada.
  useEffect(() => {
    client
      .turmas(SEMESTRE_VIGENTE, fase)
      .then((ts) => {
        setTurmasDisponiveis(ts)
        setTurma(ts[0]?.codigo ?? '')
      })
      .catch(() => {
        setTurmasDisponiveis([])
        setTurma('')
      })
  }, [fase])

  const ucsDisponiveis = useMemo(
    () => [...new Set(questoes.map((q) => q.uc_slug))].sort(),
    [questoes]
  )

  useEffect(() => {
    if (ucsDisponiveis.length && !ucsDisponiveis.includes(ucSlug)) setUcSlug(ucsDisponiveis[0])
  }, [ucsDisponiveis, ucSlug])

  const spsDisponiveis = useMemo(() => {
    const sps = new Set<string>()
    for (const q of questoes) if (q.uc_slug === ucSlug && q.sp_referencia) sps.add(q.sp_referencia)
    return [...sps].sort((a, b) => numeroSP(a) - numeroSP(b))
  }, [questoes, ucSlug])

  useEffect(() => {
    if (spsDisponiveis.length && !spsDisponiveis.includes(spRef)) setSpRef(spsDisponiveis[0])
  }, [spsDisponiveis, spRef])

  // As questões da SP, na ordem autoral (Q1..Q20). O fallback por enunciado só
  // existe para questão sem numero_origem (importada avulsa).
  const daSp = useMemo(
    () =>
      questoes
        .filter((q) => q.sp_referencia === spRef)
        .sort((a, b) =>
          (a.numero_origem ?? 9999) - (b.numero_origem ?? 9999) ||
          a.enunciado.localeCompare(b.enunciado)
        ),
    [questoes, spRef]
  )

  // Trocar de SP zera as remoções: elas eram daquela SP.
  useEffect(() => {
    setRemovidas([])
    setExpandida(null)
  }, [spRef])

  const incluidas = useMemo(() => daSp.filter((q) => !removidas.includes(q.id)), [daSp, removidas])

  const tituloSugerido = useMemo(() => {
    if (!ucSlug || !spRef) return ''
    const t = tituloSP(spRef)
    return t ? `${rotuloUC(ucSlug)} · ${rotuloSP(spRef)} — ${t}` : `${rotuloUC(ucSlug)} · ${rotuloSP(spRef)}`
  }, [ucSlug, spRef])

  const titulo = tituloManual || tituloSugerido

  async function criar() {
    if (!titulo.trim()) return setErro('Dê um título à sessão.')
    if (incluidas.length === 0) return setErro('A sessão ficaria sem questões.')
    if (!identidade) return setErro('Sessão de login expirada — entre novamente.')
    setErro(null)
    setCriando(true)
    try {
      const sessao = await client.criarSessao({
        professorId: identidade.id,
        titulo: titulo.trim(),
        fase,
        ucSlug,
        spReferencia: spRef || null,
        turma,
        questaoIds: incluidas.map((q) => q.id), // já na ordem autoral
      })
      const aberta = await client.abrirSessao(sessao.id)
      navigate(`/professor/${aberta.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar sessão')
      setCriando(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-28">
      <PageHeader title="Nova sessão" subtitle="A sessão da semana é a Situação-Problema inteira" />

      <Card className="p-5 mb-6 flex flex-col gap-4">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-semibold text-textSec mb-1">Turma</label>
            <select
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
              className="rounded border border-border px-3 py-3 text-base"
            >
              {turmasDisponiveis.length === 0 && <option value="">— sem turma nesta fase —</option>}
              {turmasDisponiveis.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.codigo}
                </option>
              ))}
            </select>
            {turmasDisponiveis.length === 0 && !carregando && (
              <p className="text-xs text-terra mt-1 max-w-[200px] leading-snug">
                Nenhuma turma cadastrada na {fase}ª fase — a coordenação define em Coordenação →
                Turmas.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-textSec mb-1">Fase</label>
            <select
              value={fase}
              onChange={(e) => setFase(Number(e.target.value))}
              className="rounded border border-border px-3 py-3 text-base"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
                <option key={f} value={f}>
                  {f}ª fase
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-sm font-semibold text-textSec mb-1">
              Unidade Curricular
            </label>
            <select
              value={ucSlug}
              onChange={(e) => setUcSlug(e.target.value)}
              className="w-full rounded border border-border px-3 py-3 text-base"
            >
              {ucsDisponiveis.map((u) => (
                <option key={u} value={u}>
                  {rotuloUC(u)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-sm font-semibold text-textSec mb-1">
              Situação-Problema da semana
            </label>
            <select
              value={spRef}
              onChange={(e) => setSpRef(e.target.value)}
              className="w-full rounded border border-border px-3 py-3 text-base"
            >
              {spsDisponiveis.map((sp) => (
                <option key={sp} value={sp}>
                  {rotuloSPCompleto(sp)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-textSec mb-1">
            Título da sessão <span className="font-normal text-textMuted">(preenchido automaticamente)</span>
          </label>
          <input
            value={titulo}
            onChange={(e) => setTituloManual(e.target.value)}
            placeholder={tituloSugerido}
            className="w-full rounded border border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
          />
        </div>
      </Card>

      {carregando ? (
        <Spinner />
      ) : daSp.length === 0 ? (
        <Card className="p-8 text-center text-textSec">
          Nenhuma questão cadastrada para esta Situação-Problema.{' '}
          <button className="text-blue underline" onClick={() => navigate('/importacao')}>
            Importar questões
          </button>
          .
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-semibold text-text">
              {incluidas.length} questões nesta sessão
              {removidas.length > 0 && (
                <span className="font-normal text-textSec"> · {removidas.length} retirada(s)</span>
              )}
            </h2>
            {removidas.length > 0 && (
              <Btn variant="ghost" onClick={() => setRemovidas([])}>
                Restaurar todas
              </Btn>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {daSp.map((q) => {
              const fora = removidas.includes(q.id)
              const aberta = expandida === q.id
              const correta = q.alternativas.find((a) => a.correta)?.letra
              return (
                <Card key={q.id} className={`p-4 ${fora ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-blueLight text-blue flex items-center justify-center text-xs font-bold">
                      {q.numero_origem ?? '–'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text">{q.enunciado}</div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {q.dificuldade_editorial && (
                          <span className="text-xs text-textMuted">
                            {NIVEL_LABEL[q.dificuldade_editorial]}
                          </span>
                        )}
                        <button
                          className="text-xs text-blue underline"
                          onClick={() => setExpandida(aberta ? null : q.id)}
                        >
                          {aberta ? 'ocultar alternativas' : 'ver alternativas e gabarito'}
                        </button>
                        <button
                          className="text-xs text-textSec underline"
                          onClick={() =>
                            setRemovidas((prev) =>
                              fora ? prev.filter((x) => x !== q.id) : [...prev, q.id]
                            )
                          }
                        >
                          {fora ? 'incluir de volta' : 'retirar da sessão'}
                        </button>
                      </div>

                      {aberta && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                          {q.texto_base && (
                            <p className="text-sm text-textSec whitespace-pre-wrap">{q.texto_base}</p>
                          )}
                          {q.alternativas.map((a) => (
                            <div
                              key={a.letra}
                              className={`rounded border px-3 py-2 text-sm ${
                                a.correta ? 'border-green bg-greenLight' : 'border-border'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <strong className="shrink-0">{a.letra}</strong>
                                <span className="flex-1">
                                  {a.texto}
                                  {a.justificativa && (
                                    <span className="block text-xs text-textSec mt-1">
                                      {a.justificativa}
                                    </span>
                                  )}
                                </span>
                                {a.correta && <Badge tone="green">gabarito</Badge>}
                              </div>
                            </div>
                          ))}
                          {!correta && (
                            <p className="text-xs text-red">
                              Atenção: esta questão não tem alternativa marcada como correta.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {erro && (
        <div className="mt-4">
          <ErrorBanner message={erro} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 flex items-center justify-between gap-4">
        <span className="text-sm text-textSec truncate">
          {incluidas.length} questões · turma {turma}
        </span>
        <Btn variant="primary" onClick={criar} disabled={criando || incluidas.length === 0}>
          {criando ? 'Criando…' : 'Criar e abrir sessão'}
        </Btn>
      </div>
    </div>
  )
}
