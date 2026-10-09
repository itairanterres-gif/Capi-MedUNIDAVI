// Porta B — estruturação de texto colado, sem IA. Porta do parser Python
// validado em docs/anexos/parse_enamed.py (produziu as 40 questões da
// amostra, 0 erros) para o formato real que a coordenação usa: um
// documento de questões e um de gabarito, por SP, casados pelo número da
// questão (ver docs/anexos/README.md "Formato de origem").
//
// Determinístico de propósito: não inventa conteúdo, só reestrutura o que
// está nos dois textos colados (mesma filosofia do script original). A
// estruturação assistida por IA para texto fora deste formato (§6 do
// brief, "Anthropic API") é trabalho futuro — precisa de função de borda
// com a chave de API no servidor, que este repo ainda não tem.
import type { Alternativa, Letra, QuestaoRascunho } from './types'

const NIVEL: Record<string, 'facil' | 'medio' | 'dificil'> = {
  fácil: 'facil',
  média: 'medio',
  difícil: 'dificil',
}

interface BlocoQuestao {
  nivel: 'facil' | 'medio' | 'dificil' | null
  linhas: string[]
}

function splitQuestoes(txt: string): Map<number, BlocoQuestao> {
  const out = new Map<number, BlocoQuestao>()
  let cur: BlocoQuestao | null = null
  for (const ln of txt.split('\n')) {
    const m = ln.match(/^QUEST[ÃA]O\s+(\d+)\s*\(N[íi]vel:\s*([A-Za-zÁ-ú]+)\)/)
    if (m) {
      cur = { nivel: NIVEL[m[2].trim().toLowerCase()] ?? null, linhas: [] }
      out.set(parseInt(m[1], 10), cur)
    } else if (cur) {
      cur.linhas.push(ln)
    }
  }
  return out
}

function parseAlternativas(linhas: string[]): { enunciado: string; alts: Partial<Record<Letra, string>> } {
  const alts: Partial<Record<Letra, string>> = {}
  const enun: string[] = []
  let curLetra: Letra | null = null
  for (const lnRaw of linhas) {
    const ln = lnRaw.trim()
    const m = ln.match(/^\(([A-D])\)\s*(.*)$/)
    if (m) {
      curLetra = m[1] as Letra
      alts[curLetra] = m[2].trim()
    } else if (curLetra) {
      if (ln) alts[curLetra] = `${alts[curLetra] ?? ''} ${ln}`
    } else if (ln) {
      enun.push(ln)
    }
  }
  return { enunciado: enun.join(' ').trim(), alts }
}

interface BlocoGabarito {
  gabarito: Letra | null
  justificativaGeral: string | null
  justs: Partial<Record<Letra, string>>
}

function parseGabarito(txt: string): Map<number, BlocoGabarito> {
  const blocos = txt.split(/QUEST[ÃA]O\s+(\d+)\s*\(N[íi]vel:[^)]*\)/)
  const out = new Map<number, BlocoGabarito>()
  for (let i = 1; i < blocos.length; i += 2) {
    const num = parseInt(blocos[i], 10)
    const corpo = blocos[i + 1] ?? ''
    const gm = corpo.match(/Resposta correta:\s*\(([A-D])\)/)
    const jg = corpo.match(/Justificativa geral:\s*([\s\S]*?)(?:\n\s*An[áa]lise|$)/)
    const justs: Partial<Record<Letra, string>> = {}
    for (const L of ['A', 'B', 'C', 'D'] as const) {
      const jm = corpo.match(
        new RegExp(`\\(${L}\\)\\s*(?:CORRETA|incorreta)\\s*[—-]\\s*([\\s\\S]*?)(?=\\n\\s*\\([A-D]\\)\\s*(?:CORRETA|incorreta)|$)`)
      )
      if (jm) justs[L] = jm[1].replace(/\s+/g, ' ').trim()
    }
    out.set(num, {
      gabarito: (gm?.[1] as Letra | undefined) ?? null,
      justificativaGeral: jg ? jg[1].replace(/\s+/g, ' ').trim() : null,
      justs,
    })
  }
  return out
}

export interface ParseColadoInput {
  textoQuestoes: string
  textoGabarito: string
  faseAlvo: number
  ucSlug: string
  spReferencia?: string | null
  fonteGeracao?: string
}

export interface ParseColadoResultado {
  rascunhos: QuestaoRascunho[]
  erros: string[] // por número de questão que não pôde ser montada
}

export function parseColado(input: ParseColadoInput): ParseColadoResultado {
  const qs = splitQuestoes(input.textoQuestoes)
  const gb = parseGabarito(input.textoGabarito)
  const rascunhos: QuestaoRascunho[] = []
  const erros: string[] = []
  const numeros = [...qs.keys()].sort((a, b) => a - b)

  for (const num of numeros) {
    const bloco = qs.get(num)!
    const { enunciado, alts } = parseAlternativas(bloco.linhas)
    const g = gb.get(num)

    const faltando: string[] = []
    if (!enunciado) faltando.push('enunciado')
    for (const L of ['A', 'B', 'C', 'D'] as const) if (!alts[L]) faltando.push(`alternativa ${L}`)
    if (!g?.gabarito) faltando.push('gabarito (linha "Resposta correta:")')
    for (const L of ['A', 'B', 'C', 'D'] as const) if (!g?.justs[L]) faltando.push(`justificativa ${L}`)

    if (faltando.length) {
      erros.push(`Questão ${num}: campo(s) não encontrado(s) — ${faltando.join(', ')}.`)
      continue
    }

    const alternativas: Alternativa[] = (['A', 'B', 'C', 'D'] as const).map((L) => {
      const correta = g!.gabarito === L
      const individual = g!.justs[L] ?? ''
      // "Justificativa geral" do gabarito não tem campo próprio no schema
      // canônico — dobrada na justificativa da correta, para não perder o
      // dado (docs/anexos/README.md, observação 4).
      const justificativa = correta && g!.justificativaGeral ? `${g!.justificativaGeral} ${individual}` : individual
      return { letra: L, texto: alts[L]!, correta, justificativa }
    })

    rascunhos.push({
      enunciado,
      texto_base: null,
      fase_alvo: input.faseAlvo,
      uc_slug: input.ucSlug,
      sp_referencia: input.spReferencia ?? null,
      tema: null,
      subtema: null,
      area_clinica: null,
      nivel_bloom: null,
      dificuldade_editorial: bloco.nivel,
      competencia_dcn_2025: [],
      oa_slugs: [],
      tags: [],
      referencia: null,
      fonte_geracao: input.fonteGeracao ?? 'porta_b:texto_colado',
      alternativas,
    })
  }

  if (numeros.length === 0) {
    erros.push('Nenhuma questão reconhecida no texto colado — confira o formato "QUESTÃO N (Nível: Fácil|Média|Difícil)".')
  }

  return { rascunhos, erros }
}
