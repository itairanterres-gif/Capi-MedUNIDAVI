// Semestre vigente. Fica num lugar só porque atravessa telas (montar sessão,
// listar turmas, criar deck) e muda duas vezes por ano.
//
// A regra das turmas em 2026-2, informada pela coordenação: o número da turma
// é 20 − fase (4ª=T16, 5ª=T15, 6ª=T14, 7ª=T13, 8ª=T12). A constante sobe 1 a
// cada semestre, porque cada turma avança uma fase por semestre. Mas as turmas
// vivem na TABELA `turmas` (editável pela coordenação), não nesta fórmula —
// calendário tem exceção, e exceção não pode exigir deploy.
export const SEMESTRE_VIGENTE = '2026-2'

/** Sugestão de código de turma para uma fase, usada só para pré-preencher. */
export function turmaSugerida(fase: number, semestre = SEMESTRE_VIGENTE): string {
  const [ano, metade] = semestre.split('-').map(Number)
  const [anoBase, metadeBase] = SEMESTRE_VIGENTE.split('-').map(Number)
  const passos = (ano - anoBase) * 2 + (metade - metadeBase)
  const n = 20 + passos - fase
  return 'T' + String(Math.max(0, n)).padStart(2, '0')
}
