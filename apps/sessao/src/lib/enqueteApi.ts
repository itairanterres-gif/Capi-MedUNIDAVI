// Interface do cliente de dados para Enquetes — espelha o contrato de
// SessaoClient (src/lib/api.ts): a MESMA interface para demo (em memória) e
// produção (Supabase), telas conhecem só isto. Nomes espelham as RPCs de
// supabase/migrations/20260818100000_enquetes.sql.
//
// Deliberadamente um contrato SEPARADO de SessaoClient, não uma extensão
// dele — enquete não compartilha banco de questões nem RPCs de gabarito;
// misturar as duas interfaces obrigaria métodos como `travar` a aceitar
// tanto sessaoQuestaoId quanto perguntaId, perdendo a garantia de tipo que
// hoje existe.

import type {
  Enquete,
  EnquetePergunta,
  EnquetePerguntaInput,
  EnqueteResumo,
  LinhaDistribuicaoEnquete,
  PerguntaParticipante,
} from './types'
import type { ContagemRespostas } from './types'

export interface NovaEnqueteInput {
  professorId: string
  titulo: string
  turma: string | null
  perguntas: EnquetePerguntaInput[] // ad-hoc, digitadas na hora — sem banco
}

export interface EnqueteClient {
  // ---------- Professor: montar e conduzir ----------
  listarEnquetes(opts?: { todas?: boolean }): Promise<EnqueteResumo[]>
  criarEnquete(input: NovaEnqueteInput): Promise<Enquete>
  abrirEnquete(enqueteId: string): Promise<Enquete>
  listarPerguntas(enqueteId: string): Promise<EnquetePergunta[]>
  avancar(enqueteId: string): Promise<EnquetePergunta> // aguardando -> aberta
  travar(perguntaId: string): Promise<void>
  encerrarEnquete(enqueteId: string): Promise<Enquete>
  contagemVotos(perguntaId: string): Promise<ContagemRespostas>
  contagemParticipantes(enqueteId: string): Promise<number>

  // ---------- Participante ----------
  entrarEnquete(codigo: string, participanteId: string): Promise<{ enqueteId: string; status: string }>
  votar(perguntaId: string, participanteId: string, opcaoIndice: number): Promise<void>

  // ---------- Compartilhado (participante e projeção) ----------
  verPergunta(perguntaId: string, viewerId: string): Promise<PerguntaParticipante>
  distribuicao(perguntaId: string): Promise<LinhaDistribuicaoEnquete[]>
  getEnquete(enqueteId: string): Promise<Enquete>

  // ---------- Realtime ----------
  subscribeEnquete(enqueteId: string, onChange: () => void): () => void
}
