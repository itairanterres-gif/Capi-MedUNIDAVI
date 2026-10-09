import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { enqueteClient } from '../../lib/enqueteClient'
import { useAuth } from '../auth/AuthContext'
import type { EnqueteTipo, EnquetePerguntaInput } from '../../lib/types'

// Ao contrário de NovaSessao (que puxa da SP inteira já atribuída, banco
// institucional), aqui as perguntas são AD-HOC — digitadas na hora. Enquete
// de opinião/quebra-gelo não tem "banco curado" por trás: é conteúdo do
// professor, não do banco de questões auditado.

const TIPO_LABEL: Record<EnqueteTipo, string> = {
  opiniao: 'Opinião (sem certo/errado)',
  quebra_gelo: 'Quebra-gelo',
  escala: 'Escala (ex.: concordância 1–5)',
}

const MODELOS: Record<EnqueteTipo, string[]> = {
  opiniao: ['Sim', 'Não'],
  quebra_gelo: ['Opção A', 'Opção B'],
  escala: ['1 — Discordo totalmente', '2', '3', '4', '5 — Concordo totalmente'],
}

function perguntaVazia(tipo: EnqueteTipo = 'opiniao'): EnquetePerguntaInput {
  return { tipo, texto: '', contexto: null, opcoes: [...MODELOS[tipo]] }
}

export function NovaEnquete() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [titulo, setTitulo] = useState('')
  const [turma, setTurma] = useState('')
  const [perguntas, setPerguntas] = useState<EnquetePerguntaInput[]>([perguntaVazia()])
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  function atualizarPergunta(idx: number, mud: Partial<EnquetePerguntaInput>) {
    setPerguntas((prev) => prev.map((p, i) => (i === idx ? { ...p, ...mud } : p)))
  }

  function trocarTipo(idx: number, tipo: EnqueteTipo) {
    atualizarPergunta(idx, { tipo, opcoes: [...MODELOS[tipo]] })
  }

  function atualizarOpcao(idx: number, opIdx: number, valor: string) {
    setPerguntas((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, opcoes: p.opcoes.map((o, j) => (j === opIdx ? valor : o)) } : p))
    )
  }

  function adicionarOpcao(idx: number) {
    setPerguntas((prev) =>
      prev.map((p, i) => (i === idx && p.opcoes.length < 6 ? { ...p, opcoes: [...p.opcoes, ''] } : p))
    )
  }

  function removerOpcao(idx: number, opIdx: number) {
    setPerguntas((prev) =>
      prev.map((p, i) => (i === idx && p.opcoes.length > 2 ? { ...p, opcoes: p.opcoes.filter((_, j) => j !== opIdx) } : p))
    )
  }

  function adicionarPergunta() {
    setPerguntas((prev) => [...prev, perguntaVazia()])
  }

  function removerPergunta(idx: number) {
    setPerguntas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function validar(): string | null {
    if (!titulo.trim()) return 'Dê um título à enquete.'
    for (const [i, p] of perguntas.entries()) {
      if (!p.texto.trim()) return `Pergunta ${i + 1}: escreva o texto.`
      const opcoesLimpas = p.opcoes.map((o) => o.trim()).filter(Boolean)
      if (opcoesLimpas.length < 2) return `Pergunta ${i + 1}: precisa de ao menos 2 opções preenchidas.`
    }
    return null
  }

  async function criar() {
    const msg = validar()
    if (msg) return setErro(msg)
    if (!identidade) return setErro('Sessão de login expirada — entre novamente.')
    setErro(null)
    setCriando(true)
    try {
      const enquete = await enqueteClient.criarEnquete({
        professorId: identidade.id,
        titulo: titulo.trim(),
        turma: turma.trim() || null,
        perguntas: perguntas.map((p) => ({ ...p, opcoes: p.opcoes.map((o) => o.trim()).filter(Boolean) })),
      })
      const aberta = await enqueteClient.abrirEnquete(enquete.id)
      navigate(`/professor/enquetes/${aberta.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar enquete')
      setCriando(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-28">
      <PageHeader
        title="Nova enquete"
        subtitle="Sem gabarito — para opinião, quebra-gelo ou escala de concordância"
      />

      <Card className="p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-textSec mb-1">Título da enquete</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Abertura de semestre — quebra-gelo"
            className="w-full rounded border border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-textSec mb-1">
            Turma <span className="font-normal text-textMuted">(opcional — deixe vazio se for aberta)</span>
          </label>
          <input
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            placeholder="Ex.: T16"
            className="w-full rounded border border-border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blueAcc"
          />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {perguntas.map((p, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge tone="blue">Pergunta {idx + 1}</Badge>
              {perguntas.length > 1 && (
                <button className="text-xs text-red underline" onClick={() => removerPergunta(idx)}>
                  remover
                </button>
              )}
            </div>

            <label className="block text-sm font-semibold text-textSec mb-1">Tipo</label>
            <select
              value={p.tipo}
              onChange={(e) => trocarTipo(idx, e.target.value as EnqueteTipo)}
              className="w-full rounded border border-border px-3 py-2 text-sm mb-3"
            >
              {(Object.keys(TIPO_LABEL) as EnqueteTipo[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-textSec mb-1">
              Contexto <span className="font-normal text-textMuted">(opcional — cenário acima da pergunta)</span>
            </label>
            <textarea
              value={p.contexto ?? ''}
              onChange={(e) => atualizarPergunta(idx, { contexto: e.target.value || null })}
              rows={2}
              className="w-full rounded border border-border px-3 py-2 text-sm mb-3"
            />

            <label className="block text-sm font-semibold text-textSec mb-1">Pergunta</label>
            <textarea
              value={p.texto}
              onChange={(e) => atualizarPergunta(idx, { texto: e.target.value })}
              rows={2}
              placeholder="O que você faria?"
              className="w-full rounded border border-border px-3 py-2 text-base mb-3"
            />

            <label className="block text-sm font-semibold text-textSec mb-1">
              Opções <span className="font-normal text-textMuted">(2 a 6 — sem opção "correta")</span>
            </label>
            <div className="flex flex-col gap-2">
              {p.opcoes.map((o, opIdx) => (
                <div key={opIdx} className="flex items-center gap-2">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-blueLight text-blue flex items-center justify-center text-xs font-bold">
                    {opIdx + 1}
                  </span>
                  <input
                    value={o}
                    onChange={(e) => atualizarOpcao(idx, opIdx, e.target.value)}
                    className="flex-1 rounded border border-border px-3 py-2 text-sm"
                  />
                  {p.opcoes.length > 2 && (
                    <button
                      className="text-xs text-textMuted underline shrink-0"
                      onClick={() => removerOpcao(idx, opIdx)}
                    >
                      remover
                    </button>
                  )}
                </div>
              ))}
              {p.opcoes.length < 6 && (
                <button className="text-xs text-blue underline text-left" onClick={() => adicionarOpcao(idx)}>
                  + adicionar opção
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <button className="text-sm text-blue underline mt-4" onClick={adicionarPergunta}>
        + adicionar outra pergunta
      </button>

      {erro && (
        <div className="mt-4">
          <ErrorBanner message={erro} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 flex items-center justify-between gap-4">
        <span className="text-sm text-textSec truncate">
          {perguntas.length} pergunta{perguntas.length > 1 ? 's' : ''}
          {turma.trim() && ` · turma ${turma.trim()}`}
        </span>
        <Btn variant="primary" onClick={criar} disabled={criando}>
          {criando ? 'Criando…' : 'Criar e abrir enquete'}
        </Btn>
      </div>
    </div>
  )
}
