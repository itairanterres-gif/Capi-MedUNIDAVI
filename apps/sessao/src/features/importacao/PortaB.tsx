// Porta B — cola o texto de questões + o texto de gabarito (o formato real
// que a coordenação usa hoje, dois documentos por SP — ver
// docs/anexos/README.md "Formato de origem") e estrutura via parseColado()
// (determinístico, sem IA — ver nota em src/lib/parseColado.ts).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import { parseColado } from '../../lib/parseColado'
import type { QuestaoRascunho } from '../../lib/types'
import { RevisaoQuestoes } from './RevisaoQuestoes'

const EXEMPLO_QUESTOES = `UC I — Proliferação Celular
SP1 — O que eu fiz de errado?

QUESTÃO 1  (Nível: Fácil)
Em qual fase do ciclo celular ocorre a duplicação do DNA?
(A) G1
(B) S
(C) G2
(D) Metáfase`

const EXEMPLO_GABARITO = `QUESTÃO 1  (Nível: Fácil)
Resposta correta: (B) S
Justificativa geral: A fase S é o período de síntese/duplicação do DNA.
Análise de todas as alternativas:
(A) incorreta — Em G1 não há replicação do DNA.
(B) CORRETA — A fase S é exatamente o período de duplicação.
(C) incorreta — G2 é preparação final, após a replicação.
(D) incorreta — Metáfase é etapa da mitose, não da intérfase.`

export function PortaB() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const [faseAlvo, setFaseAlvo] = useState(4)
  const [ucSlug, setUcSlug] = useState('')
  const [spReferencia, setSpReferencia] = useState('')
  const [textoQuestoes, setTextoQuestoes] = useState('')
  const [textoGabarito, setTextoGabarito] = useState('')
  const [errosParse, setErrosParse] = useState<string[]>([])
  const [rascunhos, setRascunhos] = useState<QuestaoRascunho[] | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [erroImportacao, setErroImportacao] = useState<string | null>(null)
  const [concluido, setConcluido] = useState<number | null>(null)

  function estruturar() {
    setErrosParse([])
    if (!ucSlug.trim()) {
      setErrosParse(['Informe o uc_slug da UC de destino antes de estruturar.'])
      return
    }
    if (!textoQuestoes.trim() || !textoGabarito.trim()) {
      setErrosParse(['Cole o texto de questões e o texto de gabarito.'])
      return
    }
    const resultado = parseColado({
      textoQuestoes,
      textoGabarito,
      faseAlvo,
      ucSlug: ucSlug.trim(),
      spReferencia: spReferencia.trim() || null,
    })
    setErrosParse(resultado.erros)
    if (resultado.rascunhos.length > 0) setRascunhos(resultado.rascunhos)
  }

  async function confirmar(selecionados: QuestaoRascunho[]) {
    setConfirmando(true)
    setErroImportacao(null)
    try {
      const importadas = await client.importarQuestoes(selecionados, identidade?.id ?? '')
      setConcluido(importadas.length)
    } catch (e) {
      setErroImportacao(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setConfirmando(false)
    }
  }

  if (concluido !== null) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <Card className="p-8">
          <div className="text-4xl mb-3">✓</div>
          <h1 className="text-xl font-bold text-text mb-2">{concluido} questão(ões) importada(s)</h1>
          <p className="text-textSec mb-6">Status: pendente — disponíveis para montar sessão.</p>
          <div className="flex gap-3 justify-center">
            <Btn variant="secondary" onClick={() => navigate('/importacao')}>
              Importar mais
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/professor/nova')}>
              Ir para Nova sessão
            </Btn>
          </div>
        </Card>
      </div>
    )
  }

  if (rascunhos) {
    return (
      <RevisaoQuestoes
        rascunhos={rascunhos}
        onVoltar={() => setRascunhos(null)}
        onConfirmar={confirmar}
        confirmando={confirmando}
        erro={erroImportacao}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <PageHeader
        title="Porta B — colar do formato da coordenação"
        subtitle="Documento de questões + documento de gabarito, casados pelo número da questão"
      />
      <Card className="p-5 flex flex-col gap-4 mb-4">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-semibold text-textSec mb-1">Fase alvo</label>
            <select
              value={faseAlvo}
              onChange={(e) => setFaseAlvo(Number(e.target.value))}
              className="rounded border border-border px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
                <option key={f} value={f}>
                  {f}ª fase
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="block text-sm font-semibold text-textSec mb-1">uc_slug</label>
            <input
              value={ucSlug}
              onChange={(e) => setUcSlug(e.target.value)}
              placeholder="med_unidavi_f04_uc01_proliferacao_celular"
              className="w-full rounded border border-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-textSec mb-1">sp_referencia (opcional)</label>
            <input
              value={spReferencia}
              onChange={(e) => setSpReferencia(e.target.value)}
              placeholder="med_unidavi_f04_uc01_sp01"
              className="w-full rounded border border-border px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-textSec">Texto — documento de questões</label>
            <button
              type="button"
              className="text-xs text-blue underline"
              onClick={() => setTextoQuestoes(EXEMPLO_QUESTOES)}
            >
              preencher exemplo
            </button>
          </div>
          <textarea
            value={textoQuestoes}
            onChange={(e) => setTextoQuestoes(e.target.value)}
            rows={14}
            placeholder={'QUESTÃO 1  (Nível: Fácil)\n<enunciado>\n(A) ...\n(B) ...\n(C) ...\n(D) ...'}
            className="w-full rounded border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blueAcc"
          />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-textSec">Texto — documento de gabarito</label>
            <button
              type="button"
              className="text-xs text-blue underline"
              onClick={() => setTextoGabarito(EXEMPLO_GABARITO)}
            >
              preencher exemplo
            </button>
          </div>
          <textarea
            value={textoGabarito}
            onChange={(e) => setTextoGabarito(e.target.value)}
            rows={14}
            placeholder={'QUESTÃO 1  (Nível: Fácil)\nResposta correta: (B) ...\nJustificativa geral: ...\nAnálise de todas as alternativas:\n(A) incorreta — ...'}
            className="w-full rounded border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blueAcc"
          />
        </Card>
      </div>

      {errosParse.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {errosParse.map((e, i) => (
            <ErrorBanner key={i} message={e} />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Btn variant="primary" onClick={estruturar}>
          Estruturar
        </Btn>
      </div>
    </div>
  )
}
