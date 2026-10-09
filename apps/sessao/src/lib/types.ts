// Tipos alinhados ao schema aprovado (supabase/migrations/) e ao contrato
// institucional schema_questao_med_unidavi.json. Ver docs/revisao-schema.md.

export type Letra = 'A' | 'B' | 'C' | 'D'

export type ItemEstado = 'aguardando' | 'aberta' | 'travada' | 'discutida'
export type SessaoStatus = 'rascunho' | 'aberta' | 'em_andamento' | 'encerrada'
export type QuestaoStatus = 'pendente' | 'curado' | 'suspenso' | 'arquivado'

// Enums canônicos de schema_questao_med_unidavi.json — mantidos em sincronia manual.
export type AreaClinica =
  | 'ciclo_basico'
  | 'clinica_medica'
  | 'cirurgia'
  | 'ginecologia_obstetricia'
  | 'pediatria'
  | 'medicina_familia_comunidade'
  | 'saude_mental'
  | 'urgencia_emergencia'

export type NivelBloom = 'conhecimento' | 'compreensao' | 'aplicacao' | 'analise' | 'sintese' | 'avaliacao'

export interface Alternativa {
  letra: Letra
  texto: string
  correta?: boolean // só presente quando o consumidor tem direito de ver (pós-travamento / staff)
  justificativa?: string
}

/** Campos de uma questão ainda sem identidade no banco — saída da importação (Porta A/B), antes de confirmar. */
export interface QuestaoRascunho {
  enunciado: string
  texto_base: string | null
  fase_alvo: number
  uc_slug: string
  sp_referencia: string | null
  tema: string | null
  subtema: string | null
  area_clinica: AreaClinica | null
  nivel_bloom: NivelBloom | null
  dificuldade_editorial: 'facil' | 'medio' | 'dificil' | null
  competencia_dcn_2025: string[] // dcn2025_comp_01..27
  oa_slugs: string[]
  tags: string[]
  referencia: string | null
  fonte_geracao: string
  alternativas: Alternativa[] // sempre as 4, com `correta` e `justificativa`
}

/** Questão como o BANCO institucional a guarda (staff), já com identidade. */
export interface Questao extends QuestaoRascunho {
  id: string
  status: QuestaoStatus
  versao: number
  /**
   * Número da questão dentro da SP de origem (Q1..Q20). A sessão semanal é o
   * conjunto já atribuído de uma SP, então a ordem autoral importa: é por este
   * campo que os itens são ordenados ao montar a sessão. Null em questão que
   * não veio de um caderno numerado (ex.: importada avulsa).
   */
  numero_origem?: number | null
}

/** Item da sessão como o ALUNO vê via rpc_ver_item — gabarito-safe até travar. */
export interface ItemAluno {
  sessao_questao_id: string
  estado: ItemEstado
  ordem: number
  enunciado: string
  texto_base: string | null
  alternativas: { posicao: number; letra: Letra; texto: string }[]
  minha_resposta?: Letra
  // presentes só após travamento:
  gabarito?: Letra
  justificativas?: Record<Letra, string>
  acertei?: boolean
}

export interface LinhaDistribuicao {
  posicao: number
  letra: Letra
  texto: string
  correta: boolean
  contagem: number
}

export interface SessaoQuestao {
  id: string
  sessao_id: string
  questao_id: string
  ordem: number
  estado: ItemEstado
  ordem_alternativas: Letra[]
}

export interface Sessao {
  id: string
  professor_id: string
  titulo: string
  fase: number
  uc_slug: string
  sp_referencia: string | null
  turma: string
  codigo: string
  status: SessaoStatus
  questao_atual: string | null // sessao_questao_id
}

// Linha da listagem "Minhas sessões" / visão da coordenação — mais enxuta
// que Sessao (não carrega uc_slug/sp_referencia/questao_atual, que só
// importam durante a condução) e traz o nome do professor, necessário
// quando a coordenação vê o conjunto de todo mundo.
export interface SessaoResumo {
  id: string
  titulo: string
  codigo: string
  turma: string
  fase: number
  status: SessaoStatus
  professor_id: string
  professor_nome: string
  criado_em: string
  encerrada_em: string | null
}

export interface ContagemRespostas {
  respostas: number
  conectados: number
}

// ---------- Resultados (migration 7) ----------

/** Linha de aluno no fechamento da sessão. NOMINAL — restrito a professor da sessão e coordenação. */
export interface AlunoResultado {
  aluno_id: string
  nome: string
  certas: number
  respondidas: number
  pct: number
}

/** Desempenho de um item no fechamento da sessão. */
export interface QuestaoResultado {
  sessao_questao_id: string
  ordem: number
  numero_origem: number | null
  enunciado: string
  respostas: number
  certas: number
  pct: number
}

/**
 * Fechamento da sessão como o PROFESSOR/COORDENAÇÃO vê. Contém dado nominal:
 * nunca projetar, nunca expor a aluno. Vem de rpc_resultado_sessao.
 */
export interface ResultadoSessao {
  total_itens: number
  participantes: number
  acerto_medio: number
  alunos: AlunoResultado[]   // ordenado do menor acerto para o maior
  questoes: QuestaoResultado[]
}

/** Fechamento como o ALUNO vê: só o próprio, mais a média da turma (agregada). */
export interface MeuResultado {
  total_itens: number
  respondidas: number
  certas: number
  pct: number
  media_turma: number
  erradas: { sessao_questao_id: string; numero_origem: number | null; minha_resposta: Letra }[]
}

// ---------- Capi-Cards (migration 8) ----------
// Contrato do repositório itairanterres-alt/Capi-MedUnidavi. `referencia` vem
// null neste app — decisão do coordenador (a bibliografia dos manuais é por SP,
// não por questão; preencher por aproximação seria pior que deixar vazio).

export interface CapiCard {
  card_id: string
  questao_id: string
  status_card: 'praticado' | 'introduzido'
  acertou_primeira: boolean | null
  due: string
  reps: number
  frente: string
  texto_base: string | null
  verso: { resposta: string; justificativa: string; referencia: string | null }
  tags: { fase: number; uc: string; sp: string | null; numero_origem: number | null }
}

/** 1 Novamente · 2 Difícil · 3 Bom · 4 Fácil — escala do Capi-MedUnidavi. */
export type NotaCard = 1 | 2 | 3 | 4

// ---------- Coordenação (migration 10) ----------
// Turma, papel e autorização são DADO, não código: antes disso a lista de
// turmas era uma constante em NovaSessao.tsx (T13/T14/T15), o que barrava
// qualquer professor de outra fase.

export interface Turma {
  semestre: string
  codigo: string
  fase: number
  ativa: boolean
}

export interface Pessoa {
  id: string
  nome: string
  email: string
  role: 'admin' | 'professor' | 'aluno'
  turma: string | null
  fase: number | null
  criado_em: string
  /** true se é a própria pessoa logada — a tela não deixa se rebaixar. */
  eu: boolean
}

export interface Autorizacao {
  email: string
  papel: 'admin' | 'professor'
  nome_sugerido: string | null
  observacao: string | null
  criado_em: string
  /** null enquanto a pessoa não fez o primeiro acesso. */
  usado_em: string | null
  tem_conta: boolean
}

// ---------- Enquetes de sala (opinião / quebra-gelo / escala) ----------
// Motor deliberadamente PARALELO ao de Sessao/SessaoQuestao/respostas, não
// uma extensão dele: enquete não tem gabarito, então reaproveitar a tabela
// `questoes` (que exige `correta` em exatamente uma alternativa) ou
// `respostas` (travada em letras A-D) forçaria dado falso ou uma
// reforma bem mais arriscada nas tabelas que sustentam a carga em produção
// dos 820 questões. Ver comentário no topo da migration
// 20260818100000_enquetes.sql para a decisão completa.
//
// O que É compartilhado de verdade: login/profiles, o padrão de código de
// 6 caracteres (+ QR opcional), o enum de estado do item (ItemEstado) e o
// enum de status da sala (SessaoStatus) — por isso os dois tipos abaixo os
// reaproveitam em vez de duplicar.

export type EnqueteTipo = 'opiniao' | 'quebra_gelo' | 'escala'

export interface Enquete {
  id: string
  professor_id: string
  titulo: string
  turma: string | null // opcional — enquete pode não ter turma fixa
  codigo: string
  status: SessaoStatus
  pergunta_atual: string | null // enquete_pergunta_id
}

export interface EnquetePerguntaInput {
  tipo: EnqueteTipo
  texto: string
  contexto: string | null
  opcoes: string[] // 2 a 6, texto livre — sem gabarito
}

export interface EnquetePergunta {
  id: string
  enquete_id: string
  ordem: number
  tipo: EnqueteTipo
  texto: string
  contexto: string | null
  opcoes: string[]
  estado: ItemEstado
}

/** Pergunta como o PARTICIPANTE vê via rpc_ver_pergunta. Nunca tem gabarito. */
export interface PerguntaParticipante {
  pergunta_id: string
  estado: ItemEstado
  ordem: number
  tipo: EnqueteTipo
  texto: string
  contexto: string | null
  opcoes: string[]
  minha_resposta?: number // índice em `opcoes`
}

export interface LinhaDistribuicaoEnquete {
  posicao: number
  texto: string
  contagem: number
}

export interface EnqueteResumo {
  id: string
  titulo: string
  codigo: string
  turma: string | null
  status: SessaoStatus
  professor_id: string
  professor_nome: string
  criado_em: string
  encerrada_em: string | null
}
