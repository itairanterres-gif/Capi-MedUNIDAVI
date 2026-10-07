// Implementação de produção do SessaoClient — chama as RPCs do schema
// aprovado (supabase/migrations/20260724100300_rpcs_realtime.sql) via
// supabase-js. Mesmo contrato do demoClient (src/lib/demoClient.ts).
//
// Não testado contra um projeto Supabase ao vivo nesta sessão (nenhum
// projeto provisionado ainda) — a fidelidade ao schema foi validada no
// smoke test em Postgres local (ver docs/revisao-schema.md). Antes de ir a
// produção: gerar database.types.ts com `supabase gen types typescript` e
// trocar os `as any` por tipos gerados.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CAPI_INTEGRATED, CAPI_STORAGE_KEY } from './capiIntegration'
import type {
  Autorizacao,
  CapiCard,
  ContagemRespostas,
  ItemAluno,
  Letra,
  LinhaDistribuicao,
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
import type { NovaSessaoInput, Papel, PapelDocente, SessaoClient } from './api'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Singleton: a MESMA instância é usada pelo SessaoClient (RPCs/tabelas) e
// pela camada de auth (features/auth). Precisa ser única porque o supabase-js
// guarda a sessão autenticada (JWT) no próprio cliente — se a auth logasse
// num cliente e as RPCs rodassem em outro, as chamadas sairiam sem o
// auth.uid() de que todo o schema (RLS + RPCs security definer) depende.
// `undefined` = ainda não resolvido; `null` = env ausente (modo demo).
let _sb: SupabaseClient | null | undefined

export function criarSupabaseClient(): SupabaseClient | null {
  if (_sb !== undefined) return _sb
  _sb =
    !url || !anonKey
      ? null
      : createClient(url, anonKey, {
          auth: {
            ...(CAPI_INTEGRATED ? { storageKey: CAPI_STORAGE_KEY } : {}),
            // PKCE devolve o token via query string (?code=...) em vez de
            // fragmento (#access_token=...), evitando colisão com o HashRouter
            // (que usa o próprio # para as rotas). detectSessionInUrl troca o
            // code por sessão automaticamente no carregamento.
            flowType: 'pkce',
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
          },
        })
  return _sb
}

function mustClient(sb: SupabaseClient | null): SupabaseClient {
  if (!sb) {
    throw new Error(
      'Supabase não configurado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env local) ou use o modo demo.'
    )
  }
  return sb
}

export function makeSupabaseSessaoClient(sb: SupabaseClient | null): SessaoClient {
  return {
    async listarBancoQuestoes(filtro) {
      const client = mustClient(sb)
      let q = client.from('questoes').select('*, questao_alternativas(*)')
      if (filtro?.fase !== undefined) q = q.eq('fase_alvo', filtro.fase)
      if (filtro?.ucSlug !== undefined) q = q.eq('uc_slug', filtro.ucSlug)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(rowParaQuestao)
    },

    async importarQuestoes(rascunhos: QuestaoRascunho[], autorId: string) {
      const client = mustClient(sb)
      const resultado: Questao[] = []
      // Uma a uma (não em lote) para poder amarrar cada linha de
      // questao_alternativas ao id gerado — mesma lógica de criarSessao.
      // RLS "staff importa" já cobre o insert (staff + criado_por = auth.uid()).
      for (const r of rascunhos) {
        const { data: questaoRow, error: e1 } = await client
          .from('questoes')
          .insert({
            payload: payloadCanonico(r, autorId),
            enunciado: r.enunciado,
            texto_base: r.texto_base,
            fase_alvo: r.fase_alvo,
            uc_slug: r.uc_slug,
            sp_referencia: r.sp_referencia,
            tema: r.tema,
            subtema: r.subtema,
            area_clinica: r.area_clinica,
            nivel_bloom: r.nivel_bloom,
            dificuldade_editorial: r.dificuldade_editorial,
            competencia_dcn_2025: r.competencia_dcn_2025,
            oa_slugs: r.oa_slugs,
            tags: r.tags,
            referencia: r.referencia,
            fonte_geracao: r.fonte_geracao,
            criado_por: autorId,
          })
          .select()
          .single()
        if (e1) throw e1
        const linhas = r.alternativas.map((a) => ({
          questao_id: questaoRow.id,
          letra: a.letra,
          texto: a.texto,
          correta: !!a.correta,
          justificativa: a.justificativa ?? '',
        }))
        const { error: e2 } = await client.from('questao_alternativas').insert(linhas)
        if (e2) throw e2
        resultado.push({ ...rowParaQuestao(questaoRow), alternativas: r.alternativas })
      }
      return resultado
    },

    async listarSessoes(opts?: { todas?: boolean }) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_listar_sessoes', {
        p_todas: opts?.todas ?? false,
      })
      if (error) throw error
      return (data ?? []) as SessaoResumo[]
    },

    async criarSessao(input: NovaSessaoInput) {
      const client = mustClient(sb)
      const { data: sessao, error: e1 } = await client
        .from('sessoes')
        .insert({
          professor_id: input.professorId,
          titulo: input.titulo,
          fase: input.fase,
          uc_slug: input.ucSlug,
          sp_referencia: input.spReferencia,
          turma: input.turma,
        })
        .select()
        .single()
      if (e1) throw e1
      const linhas = input.questaoIds.map((questao_id, idx) => ({
        sessao_id: sessao.id,
        questao_id,
        ordem: idx + 1,
        ordem_alternativas: embaralharLetras(),
      }))
      const { error: e2 } = await client.from('sessao_questoes').insert(linhas)
      if (e2) throw e2
      return rowParaSessao(sessao)
    },

    async abrirSessao(sessaoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client
        .from('sessoes')
        .update({ status: 'aberta', aberta_em: new Date().toISOString() })
        .eq('id', sessaoId)
        .select()
        .single()
      if (error) throw error
      return rowParaSessao(data)
    },

    async listarItens(sessaoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client
        .from('sessao_questoes')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('ordem')
      if (error) throw error
      return (data ?? []).map(rowParaItem)
    },

    async avancar(sessaoId: string) {
      // Em produção isto seria uma RPC dedicada (rpc_avancar_item) para
      // manter a transição atômica no servidor; aqui, duas chamadas.
      const client = mustClient(sb)
      const { data: itens, error: e1 } = await client
        .from('sessao_questoes')
        .select('*')
        .eq('sessao_id', sessaoId)
        .eq('estado', 'aguardando')
        .order('ordem')
        .limit(1)
      if (e1) throw e1
      const proximo = itens?.[0]
      if (!proximo) throw new Error('Não há próximo item')
      const { data, error: e2 } = await client
        .from('sessao_questoes')
        .update({ estado: 'aberta', aberta_em: new Date().toISOString() })
        .eq('id', proximo.id)
        .select()
        .single()
      if (e2) throw e2
      await client
        .from('sessoes')
        .update({ status: 'em_andamento', questao_atual: proximo.id })
        .eq('id', sessaoId)
      return rowParaItem(data)
    },

    async travar(sessaoQuestaoId: string) {
      const client = mustClient(sb)
      const { error } = await client
        .from('sessao_questoes')
        .update({ estado: 'travada', travada_em: new Date().toISOString() })
        .eq('id', sessaoQuestaoId)
      if (error) throw error
    },

    async encerrarSessao(sessaoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client
        .from('sessoes')
        .update({ status: 'encerrada', encerrada_em: new Date().toISOString() })
        .eq('id', sessaoId)
        .select()
        .single()
      if (error) throw error
      // Gera o baralho de todos os participantes agora, não quando cada um
      // abrir a tela. Falha aqui não pode impedir o encerramento da sessão —
      // `gerarDeck` continua rodando, idempotente, na abertura dos cards.
      try {
        await client.rpc('rpc_gerar_decks_da_sessao', { p_sessao_id: sessaoId })
      } catch {
        /* silencioso de propósito: a rede de segurança cobre */
      }
      return rowParaSessao(data)
    },

    async contagemRespostas(sessaoQuestaoId: string): Promise<ContagemRespostas> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_contagem_respostas', {
        p_sessao_questao_id: sessaoQuestaoId,
      })
      if (error) throw error
      return data as ContagemRespostas
    },

    async contagemParticipantes(sessaoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_contagem_participantes', { p_sessao_id: sessaoId })
      if (error) throw error
      return data as number
    },

    async validarQuestao(questaoId: string, validada: boolean) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_validar_questao', {
        p_questao_id: questaoId,
        p_validada: validada,
      })
      if (error) throw error
    },

    // ---------- Coordenação (migration 10) ----------

    async turmas(semestre?: string, fase?: number) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_turmas', {
        p_semestre: semestre ?? null,
        p_fase: fase ?? null,
      })
      if (error) throw error
      return (data ?? []) as Turma[]
    },

    async definirTurma(turma: Turma) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_definir_turma', {
        p_semestre: turma.semestre,
        p_codigo: turma.codigo,
        p_fase: turma.fase,
        p_ativa: turma.ativa,
      })
      if (error) throw error
    },

    async listarPessoas(filtro?: { busca?: string; role?: Papel }) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_listar_pessoas', {
        p_busca: filtro?.busca ?? null,
        p_role: filtro?.role ?? null,
      })
      if (error) throw error
      return (data ?? []) as Pessoa[]
    },

    async definirPapel(pessoaId: string, papel: Papel) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_definir_papel', {
        p_pessoa_id: pessoaId,
        p_role: papel,
      })
      if (error) throw error
    },

    async definirTurmaFase(pessoaId: string, turma: string | null, fase: number | null) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_definir_turma_fase', {
        p_pessoa_id: pessoaId,
        p_turma: turma,
        p_fase: fase,
      })
      if (error) throw error
    },

    async listarAutorizacoes() {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_listar_autorizacoes')
      if (error) throw error
      return (data ?? []) as Autorizacao[]
    },

    async autorizarDocente(email: string, papel: PapelDocente, nome?: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_autorizar_docente', {
        p_email: email,
        p_papel: papel,
        p_nome: nome ?? null,
      })
      if (error) throw error
      return (data as 'aplicado' | 'pendente') ?? 'pendente'
    },

    async revogarAutorizacao(email: string) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_revogar_autorizacao', { p_email: email })
      if (error) throw error
    },

    async resultadoSessao(sessaoId: string): Promise<ResultadoSessao> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_resultado_sessao', { p_sessao_id: sessaoId })
      if (error) throw error
      return data as ResultadoSessao
    },

    async meuResultado(sessaoId: string, _alunoId: string): Promise<MeuResultado> {
      // o aluno é auth.uid() no servidor — o parâmetro existe só para casar
      // com a assinatura do demoClient, que não tem sessão de verdade.
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_meu_resultado', { p_sessao_id: sessaoId })
      if (error) throw error
      return data as MeuResultado
    },

    async gerarDecksDaSessao(sessaoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_gerar_decks_da_sessao', {
        p_sessao_id: sessaoId,
      })
      if (error) throw error
      return (data as number) ?? 0
    },

    async gerarDeck(sessaoId: string, _alunoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_gerar_deck', { p_sessao_id: sessaoId })
      if (error) throw error
      return (data as number) ?? 0
    },

    async cardsDevidos(_alunoId: string, limite = 50): Promise<CapiCard[]> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_cards_devidos', { p_limite: limite })
      if (error) throw error
      return (data as CapiCard[]) ?? []
    },

    async revisarCard(cardId: string, nota: NotaCard) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_revisar_card', {
        p_card_id: cardId,
        p_nota: nota,
      })
      if (error) throw error
      return data as { dias: number }
    },

    async previaIntervalos(cardId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_previa_intervalos', { p_card_id: cardId })
      if (error) throw error
      return (data as Record<string, number>) ?? {}
    },

    async entrarSessao(codigo: string, _alunoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_entrar_sessao', { p_codigo: codigo })
      if (error) throw error
      return { sessaoId: data.sessao_id, status: data.status }
    },

    async responder(sessaoQuestaoId: string, _alunoId: string, letra: Letra) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_responder', {
        p_sessao_questao_id: sessaoQuestaoId,
        p_alternativa: letra,
      })
      if (error) throw error
    },

    async verItem(sessaoQuestaoId: string, _viewerId: string): Promise<ItemAluno> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_ver_item', {
        p_sessao_questao_id: sessaoQuestaoId,
      })
      if (error) throw error
      return data as ItemAluno
    },

    async distribuicao(sessaoQuestaoId: string): Promise<LinhaDistribuicao[]> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_distribuicao', {
        p_sessao_questao_id: sessaoQuestaoId,
      })
      if (error) throw error
      return data as LinhaDistribuicao[]
    },

    async getSessao(sessaoId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.from('sessoes').select('*').eq('id', sessaoId).single()
      if (error) throw error
      return rowParaSessao(data)
    },

    subscribeSessao(sessaoId: string, onChange: () => void) {
      const client = mustClient(sb)
      const channel = client
        .channel(`sessao:${sessaoId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessoes', filter: `id=eq.${sessaoId}` },
          onChange
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessao_questoes', filter: `sessao_id=eq.${sessaoId}` },
          onChange
        )
        .subscribe()
      return () => {
        client.removeChannel(channel)
      }
    },
  }
}

function embaralharLetras(): Letra[] {
  const a: Letra[] = ['A', 'B', 'C', 'D']
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- mapeamento linha-do-banco -> tipo de domínio ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowParaSessao(row: any): Sessao {
  return {
    id: row.id,
    professor_id: row.professor_id,
    titulo: row.titulo,
    fase: row.fase,
    uc_slug: row.uc_slug,
    sp_referencia: row.sp_referencia,
    turma: row.turma,
    codigo: row.codigo,
    status: row.status,
    questao_atual: row.questao_atual,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowParaItem(row: any): SessaoQuestao {
  return {
    id: row.id,
    sessao_id: row.sessao_id,
    questao_id: row.questao_id,
    ordem: row.ordem,
    estado: row.estado,
    ordem_alternativas: row.ordem_alternativas,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowParaQuestao(row: any): Questao {
  return {
    id: row.id,
    enunciado: row.enunciado,
    texto_base: row.texto_base,
    fase_alvo: row.fase_alvo,
    uc_slug: row.uc_slug,
    sp_referencia: row.sp_referencia,
    tema: row.tema,
    subtema: row.subtema,
    area_clinica: row.area_clinica,
    nivel_bloom: row.nivel_bloom,
    dificuldade_editorial: row.dificuldade_editorial,
    numero_origem: row.numero_origem ?? null,
    competencia_dcn_2025: row.competencia_dcn_2025 ?? [],
    oa_slugs: row.oa_slugs ?? [],
    tags: row.tags ?? [],
    referencia: row.referencia,
    fonte_geracao: row.fonte_geracao,
    status: row.status,
    versao: row.versao,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alternativas: (row.questao_alternativas ?? []).map((a: any) => ({
      letra: a.letra,
      texto: a.texto,
      correta: a.correta,
      justificativa: a.justificativa,
    })),
  }
}

// Documento canônico completo para a coluna `payload` (fidelidade de
// ida-e-volta com schema_questao_med_unidavi.json) — os campos que a
// coluna projetada não guarda (uso_em_avaliacoes, performance, auditoria,
// cenario_origem) nascem no default do schema; uma questão 'pendente'
// legitimamente não tem tudo preenchido ainda (curadoria completa depois).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function payloadCanonico(r: QuestaoRascunho, autorId: string): Record<string, any> {
  return {
    tipo: 'questao',
    fase_alvo: r.fase_alvo,
    uc_slug: r.uc_slug,
    sp_referencia: r.sp_referencia,
    tema: r.tema,
    subtema: r.subtema,
    area_clinica: r.area_clinica,
    nivel_bloom: r.nivel_bloom,
    dificuldade_editorial: r.dificuldade_editorial,
    competencia_dcn_2025: r.competencia_dcn_2025,
    cenario_origem: ['nao_especificado'],
    tags: r.tags,
    texto_base: r.texto_base,
    enunciado: r.enunciado,
    alternativas: r.alternativas,
    oa_slugs: r.oa_slugs,
    referencia: r.referencia,
    fonte_geracao: r.fonte_geracao,
    status_curadoria: 'pendente',
    disponibilidade: 'disponivel',
    versao: 1,
    uso_em_avaliacoes: { total_avaliativo: 0, ultima_avaliacao_em: null, historico: [] },
    performance: { n_respostas_treino: 0, n_respostas_avaliativo: 0 },
    auditoria: { criada_por: autorId, criada_em: new Date().toISOString() },
  }
}
