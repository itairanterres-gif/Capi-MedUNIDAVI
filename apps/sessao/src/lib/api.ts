// Interface do cliente de dados — a MESMA para o app real (Supabase, via
// supabaseClient.ts) e para o modo demo (demoClient.ts, em memória, com as
// 40 questões reais da amostra). As telas (features/) só conhecem este
// contrato; trocar de demo para produção é trocar a implementação injetada
// em main.tsx, sem tocar UI.
//
// Os nomes espelham as RPCs do schema aprovado (rpc_entrar_sessao,
// rpc_ver_item, rpc_responder, rpc_distribuicao, rpc_contagem_respostas)
// para que a migração para o SupabaseClient real seja mecânica.

import type {
  Autorizacao,
  CapiCard,
  ContagemRespostas,
  ItemAluno,
  LinhaDistribuicao,
  Letra,
  MeuResultado,
  NotaCard,
  Pessoa,
  Questao,
  QuestaoRascunho,
  ResultadoSessao,
  Sessao,
  SessaoQuestao,
  SessaoResumo,
  Turma,
} from './types'

export type Papel = 'admin' | 'professor' | 'aluno'
export type PapelDocente = 'admin' | 'professor'

export interface NovaSessaoInput {
  professorId: string
  titulo: string
  fase: number
  ucSlug: string
  spReferencia: string | null
  turma: string
  questaoIds: string[] // ordem de seleção = ordem inicial
}

export interface SessaoClient {
  // ---------- Professor: montar e conduzir ----------
  listarBancoQuestoes(filtro?: { fase?: number; ucSlug?: string }): Promise<Questao[]>
  // Importação (Porta A: JSON já no schema canônico; Porta B: parseColado()
  // no cliente). Ambas as portas convergem aqui — o cliente só recebe
  // rascunhos já estruturados, nasce status 'pendente', versao 1.
  importarQuestoes(rascunhos: QuestaoRascunho[], autorId: string): Promise<Questao[]>
  // "Minhas sessões": sem todas (ou com todas=false), sempre só as do
  // professor logado — mesmo para admin. Com todas=true, a coordenação vê
  // o conjunto de todo mundo (a trava de quem pode pedir isso é no servidor,
  // não aqui). É a porta de entrada básica: achar uma sessão passada para
  // ver o resultado, ou uma em rascunho para retomar.
  // professorId só é usado pelo demoClient (sem auth.uid() para inferir
  // "quem está pedindo"); o supabaseClient ignora — a RPC já sabe pela sessão.
  listarSessoes(opts?: { todas?: boolean; professorId?: string }): Promise<SessaoResumo[]>
  criarSessao(input: NovaSessaoInput): Promise<Sessao>
  abrirSessao(sessaoId: string): Promise<Sessao>
  listarItens(sessaoId: string): Promise<SessaoQuestao[]>
  avancar(sessaoId: string): Promise<SessaoQuestao> // aguardando -> aberta (embaralha alternativas)
  travar(sessaoQuestaoId: string): Promise<void>
  encerrarSessao(sessaoId: string): Promise<Sessao>
  contagemRespostas(sessaoQuestaoId: string): Promise<ContagemRespostas>
  // Contador cru de participantes — usado pela projeção enquanto a sessão
  // está 'aberta' e nenhum item foi aberto ainda (contagemRespostas exige
  // um sessaoQuestaoId, que só existe depois do 1º avançar).
  contagemParticipantes(sessaoId: string): Promise<number>

  // Validação da questão em aula (decisão do coordenador: não há tela de
  // curadoria — o professor marca na hora em que discute o item).
  // true -> 'curado'; false -> 'suspenso'.
  validarQuestao(questaoId: string, validada: boolean): Promise<void>
  // Fechamento da sessão, NOMINAL — só professor da sessão e coordenação.
  resultadoSessao(sessaoId: string): Promise<ResultadoSessao>

  // ---------- Aluno ----------
  entrarSessao(codigo: string, alunoId: string): Promise<{ sessaoId: string; status: string }>
  responder(sessaoQuestaoId: string, alunoId: string, letra: Letra): Promise<void>
  // Só o próprio desempenho + a média da turma (número agregado).
  meuResultado(sessaoId: string, alunoId: string): Promise<MeuResultado>

  // ---------- Capi-Cards ----------
  // Deck liberado ao fim da sessão: cada questão respondida vira um card
  // [praticado]. Idempotente — reabrir não duplica nem reinicia o agendamento.
  gerarDeck(sessaoId: string, alunoId: string): Promise<number>
  /**
   * Gera o baralho de TODOS os participantes de uma vez, ao encerrar a sessão
   * (decisão do coordenador: "a lógica é já gerar"). Antes, o baralho só
   * nascia quando o aluno abria a tela — quem nunca abrisse não tinha card
   * nenhum, e a coordenação não sabia quantos decks existiam de fato.
   * `gerarDeck` continua existindo, idempotente, como rede de segurança.
   */
  gerarDecksDaSessao(sessaoId: string): Promise<number>
  cardsDevidos(alunoId: string, limite?: number): Promise<CapiCard[]>
  // Registra "como foi sua memória" e reagenda. Devolve só o próximo
  // intervalo — nunca pontuação (o deck não tem nota, por contrato).
  revisarCard(cardId: string, nota: NotaCard): Promise<{ dias: number }>
  // Os quatro intervalos possíveis PARA ESTE card, para o botão não mentir.
  previaIntervalos(cardId: string): Promise<Record<string, number>>

  // ---------- Compartilhado (aluno e projeção) ----------
  verItem(sessaoQuestaoId: string, viewerId: string): Promise<ItemAluno>
  distribuicao(sessaoQuestaoId: string): Promise<LinhaDistribuicao[]>
  getSessao(sessaoId: string): Promise<Sessao>

  // ---------- Realtime ----------
  // Retorna função de unsubscribe. No demo, é polling leve; em produção,
  // Supabase Realtime (postgres_changes) nas tabelas sessoes/sessao_questoes.
  subscribeSessao(sessaoId: string, onChange: () => void): () => void

  // ---------- Coordenação (admin) ----------
  // "A inserção de professores precisa ser por uma tela dos administradores/
  // coordenadores" — condição inicial do projeto. Tudo aqui é restrito a
  // admin no servidor (migration 10), exceto `turmas`, que o professor
  // precisa ler para montar a sessão.
  turmas(semestre?: string, fase?: number): Promise<Turma[]>
  definirTurma(turma: Turma): Promise<void>
  listarPessoas(filtro?: { busca?: string; role?: Papel }): Promise<Pessoa[]>
  definirPapel(pessoaId: string, papel: Papel): Promise<void>
  definirTurmaFase(pessoaId: string, turma: string | null, fase: number | null): Promise<void>
  listarAutorizacoes(): Promise<Autorizacao[]>
  /** 'aplicado' = já tinha conta e virou docente agora; 'pendente' = vira no 1º acesso. */
  autorizarDocente(email: string, papel: PapelDocente, nome?: string): Promise<'aplicado' | 'pendente'>
  revogarAutorizacao(email: string): Promise<void>
}
