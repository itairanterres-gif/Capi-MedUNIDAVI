// Integrated hosting copy: legacy corpus remains in the original repository.
import type { Alternativa } from './types'

export interface QuestaoSeed {
  enunciado: string
  texto_base: string | null
  fase_alvo: number
  uc_slug: string
  sp_referencia: string | null
  tema: string | null
  dificuldade_editorial: 'facil' | 'medio' | 'dificil' | null
  alternativas: Alternativa[]
  /** Número da questão dentro da SP de origem (Q1..Q20). Define a ordem da sessão. */
  numero_origem: number | null
  _proveniencia: string
}

export const QUESTOES_SEED: QuestaoSeed[] = []
