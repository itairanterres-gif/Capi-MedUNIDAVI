// Porta A — upload/colagem de JSON já no schema canônico (ou próximo dele).
// Aceita um objeto-questão, um array, ou {"questoes": [...]} — mesma
// flexibilidade de entrada do validate_questao.py institucional.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn, Card, ErrorBanner, PageHeader } from '../../ui/kit'
import { client } from '../../lib/client'
import { useAuth } from '../auth/AuthContext'
import type { Alternativa, AreaClinica, Letra, NivelBloom, QuestaoRascunho } from '../../lib/types'
import { RevisaoQuestoes } from './RevisaoQuestoes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paraRascunho(raw: any): QuestaoRascunho {
  return {
    enunciado: typeof raw.enunciado === 'string' ? raw.enunciado : '',
    texto_base: raw.texto_base ?? null,
    fase_alvo: Number(raw.fase_alvo ?? raw.fase ?? 0),
    uc_slug: typeof raw.uc_slug === 'string' ? raw.uc_slug : '',
    sp_referencia: raw.sp_referencia ?? null,
    tema: raw.tema ?? null,
    subtema: raw.subtema ?? null,
    area_clinica: (raw.area_clinica ?? null) as AreaClinica | null,
    nivel_bloom: (raw.nivel_bloom ?? null) as NivelBloom | null,
    dificuldade_editorial: raw.dificuldade_editorial ?? null,
    competencia_dcn_2025: Array.isArray(raw.competencia_dcn_2025) ? raw.competencia_dcn_2025 : [],
    oa_slugs: Array.isArray(raw.oa_slugs) ? raw.oa_slugs : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    referencia: raw.referencia ?? null,
    fonte_geracao: typeof raw.fonte_geracao === 'string' ? raw.fonte_geracao : 'porta_a:json',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alternativas: Array.isArray(raw.alternativas)
      ? raw.alternativas.map(
          (a: any): Alternativa => ({
            letra: a.letra as Letra,
            texto: typeof a.texto === 'string' ? a.texto : '',
            correta: !!a.correta,
            justificativa: typeof a.justificativa === 'string' ? a.justificativa : '',
          })
        )
      : [],
  }
}

function extrairLista(json: unknown): unknown[] {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>
    if (Array.isArray(obj.questoes)) return obj.questoes
    return [json]
  }
  return []
}

export function PortaA() {
  const navigate = useNavigate()
  const { identidade } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [erroParse, setErroParse] = useState<string | null>(null)
  const [rascunhos, setRascunhos] = useState<QuestaoRascunho[] | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [erroImportacao, setErroImportacao] = useState<string | null>(null)
  const [concluido, setConcluido] = useState<number | null>(null)

  function analisar() {
    setErroParse(null)
    if (!texto.trim()) {
      setErroParse('Cole ou envie um JSON primeiro.')
      return
    }
    let json: unknown
    try {
      json = JSON.parse(texto)
    } catch (e) {
      setErroParse(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    const lista = extrairLista(json)
    if (lista.length === 0) {
      setErroParse('Nenhuma questão encontrada — esperado um objeto, um array, ou {"questoes": [...]}.')
      return
    }
    setRascunhos(lista.map(paraRascunho))
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

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(setTexto)
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
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="Porta A — JSON no schema canônico" subtitle="Cole o texto ou envie um arquivo .json" />
      <Card className="p-5 flex flex-col gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onArquivo}
          className="text-sm"
        />
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder='{"enunciado": "...", "fase_alvo": 4, "uc_slug": "med_unidavi_f04_uc01_...", "alternativas": [...] }'
          rows={14}
          className="w-full rounded border border-border px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blueAcc"
        />
        {erroParse && <ErrorBanner message={erroParse} />}
        <div className="flex justify-end">
          <Btn variant="primary" onClick={analisar}>
            Analisar
          </Btn>
        </div>
      </Card>
    </div>
  )
}
