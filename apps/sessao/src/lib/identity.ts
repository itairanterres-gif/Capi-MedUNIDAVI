// Identidade no modo demo — substitui a auth real (magic link + profiles,
// feature auth/ ainda não construída nesta fatia). Personas fixas espelham
// o piloto: 1 professor, alunos numerados. Em produção, isto vem de
// supabase.auth + tabela profiles.
//
// sessionStorage (não localStorage) DE PROPÓSITO: cada aba do navegador
// precisa poder ser um aluno diferente para demonstrar a sessão com
// "vários alunos" de verdade (abrir N abas = N alunos simultâneos
// respondendo). localStorage seria compartilhado entre abas e quebraria
// isso.
export interface Identidade {
  id: string
  nome: string
  role: 'admin' | 'professor' | 'aluno'
  /**
   * false = conta criada pela importação e a senha inicial ainda não foi
   * trocada. O app bloqueia tudo até a troca (migration 12). Docente que
   * entra por link mágico nasce true — não tem senha para trocar.
   */
  senhaDefinida?: boolean
}

// Quem pode conduzir sessão / importar / curar: professor ou admin.
export function ehStaff(identidade: Identidade | null): boolean {
  return identidade?.role === 'professor' || identidade?.role === 'admin'
}

// Quem administra pessoas, papéis e turmas: só admin (coordenação).
export function ehAdmin(identidade: Identidade | null): boolean {
  return identidade?.role === 'admin'
}

export const PROFESSOR_DEMO: Identidade = { id: 'prof_1', nome: 'Prof. Ana Beatriz', role: 'professor' }

// Coordenação no modo demo. O `id` casa com EU_DEMO no demoClient para que a
// trava "não se rebaixe" seja exercitável na tela.
export const ADMIN_DEMO: Identidade = { id: 'pessoa_1', nome: 'Itairan Terres', role: 'admin' }

const CHAVE = 'sessao-questoes:identidade-demo'

export function alunoDemo(numero: number): Identidade {
  return { id: `aluno_${numero}`, nome: `Aluno ${numero}`, role: 'aluno' }
}

export function lerIdentidade(): Identidade | null {
  const raw = sessionStorage.getItem(CHAVE)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Identidade
  } catch {
    return null
  }
}

export function salvarIdentidade(identidade: Identidade) {
  sessionStorage.setItem(CHAVE, JSON.stringify(identidade))
}

export function sairIdentidade() {
  sessionStorage.removeItem(CHAVE)
}
