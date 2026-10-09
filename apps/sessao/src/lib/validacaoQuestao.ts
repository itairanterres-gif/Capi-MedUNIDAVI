// Validação mecânica de questões na importação — espelha a fração
// objetivável de docs/anexos/schema-institucional/validate_questao.py e os
// patterns de schema_questao_med_unidavi.json. Não reimplementa o JSON
// Schema inteiro (isso é trabalho do validador Python institucional); cobre
// só o que é ERRO sem ambiguidade, para bloquear import de dado quebrado.
//
// Duas exigências diferentes, deliberadamente separadas (ver migration
// schema_inicial.sql): uma questão nasce 'pendente' e pode faltar
// tema/area_clinica/nivel_bloom/competência — só quando o docente tenta
// marcá-la 'curado' esses campos passam a ser obrigatórios.
import type { QuestaoRascunho } from './types'

export const PATTERN_UC_SLUG = /^med_unidavi_f(0[1-9]|1[0-2])_uc(0[1-9]|10)_[a-z_]+$/
export const PATTERN_SP_REFERENCIA = /^med_unidavi_f(0[1-9]|1[0-2])_uc(0[1-9]|10)_sp(0[1-9]|[1-9][0-9])$/
export const PATTERN_COMPETENCIA_DCN = /^dcn2025_comp_(0[1-9]|1[0-9]|2[0-7])$/

const TERMOS_PROIBIDOS = [/todas as anteriores/i, /nenhuma das anteriores/i]

export interface ValidacaoQuestao {
  erros: string[]
  avisos: string[]
}

export function validarRascunho(q: Partial<QuestaoRascunho>): ValidacaoQuestao {
  const erros: string[] = []
  const avisos: string[] = []

  if (!q.enunciado || !q.enunciado.trim()) erros.push('Enunciado vazio.')
  else if (q.enunciado.length > 1000) erros.push('Enunciado excede 1000 caracteres.')
  else if (!q.enunciado.includes('?') && !/\bassinale\b|\bidentifique\b|\bqual\b/i.test(q.enunciado)) {
    avisos.push('Enunciado não parece ser uma pergunta direta (sem "?").')
  }

  if (q.fase_alvo === undefined || q.fase_alvo === null) {
    erros.push('Fase alvo não informada.')
  } else if (q.fase_alvo < 1 || q.fase_alvo > 12) {
    erros.push('Fase alvo fora do intervalo 1-12.')
  }

  if (!q.uc_slug || !q.uc_slug.trim()) {
    erros.push('uc_slug não informado.')
  } else if (!PATTERN_UC_SLUG.test(q.uc_slug)) {
    erros.push(`uc_slug fora do padrão institucional: "${q.uc_slug}".`)
  } else if (q.fase_alvo !== undefined && q.fase_alvo !== null) {
    const faseNoSlug = Number(q.uc_slug.match(/_f(\d{2})_/)?.[1])
    if (faseNoSlug && faseNoSlug !== q.fase_alvo) {
      erros.push(`fase_alvo (${q.fase_alvo}) não bate com a fase do uc_slug (${faseNoSlug}).`)
    }
  }

  if (q.sp_referencia && !PATTERN_SP_REFERENCIA.test(q.sp_referencia)) {
    erros.push(`sp_referencia fora do padrão institucional: "${q.sp_referencia}".`)
  }

  if (q.competencia_dcn_2025?.length) {
    const invalidas = q.competencia_dcn_2025.filter((c) => !PATTERN_COMPETENCIA_DCN.test(c))
    if (invalidas.length) erros.push(`competencia_dcn_2025 com slug(s) inválido(s): ${invalidas.join(', ')}.`)
    if (q.competencia_dcn_2025.length > 7) erros.push('Mais de 7 competências (máximo do schema é 7).')
  }

  const alts = q.alternativas ?? []
  if (alts.length !== 4) {
    erros.push(`Deve ter exatamente 4 alternativas — encontradas ${alts.length}.`)
  } else {
    const letras = alts.map((a) => a.letra)
    for (const letra of ['A', 'B', 'C', 'D'] as const) {
      if (!letras.includes(letra)) erros.push(`Falta a alternativa ${letra}.`)
    }
    if (new Set(letras).size !== letras.length) erros.push('Letras de alternativa repetidas.')

    const corretas = alts.filter((a) => a.correta === true)
    if (corretas.length === 0) erros.push('Nenhuma alternativa marcada como correta.')
    if (corretas.length > 1) erros.push(`Mais de uma alternativa marcada como correta (${corretas.length}).`)

    alts.forEach((a) => {
      if (!a.texto || !a.texto.trim()) erros.push(`Alternativa ${a.letra}: texto vazio.`)
      if (!a.justificativa || !a.justificativa.trim()) erros.push(`Alternativa ${a.letra}: justificativa vazia.`)
      if (a.texto && TERMOS_PROIBIDOS.some((re) => re.test(a.texto))) {
        erros.push(`Alternativa ${a.letra}: "todas/nenhuma das anteriores" não é permitido (Guia ENADE).`)
      }
    })

    if (corretas.length === 1 && corretas[0].letra !== 'A') {
      avisos.push('Correta não está na letra A (convenção do gerador institucional — ok se vier de importação manual/Porta B).')
    }
  }

  return { erros, avisos }
}

/** Campos que faltam para esta questão poder ir de 'pendente' para 'curado'. */
export function pendenciasParaCurar(q: QuestaoRascunho): string[] {
  const faltando: string[] = []
  if (!q.tema) faltando.push('tema')
  if (!q.area_clinica) faltando.push('area_clinica')
  if (!q.nivel_bloom) faltando.push('nivel_bloom')
  if (!q.competencia_dcn_2025.length) faltando.push('competencia_dcn_2025 (ao menos 1)')
  return faltando
}
