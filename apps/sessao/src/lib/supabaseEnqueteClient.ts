// Implementação de produção do EnqueteClient — chama as RPCs de
// supabase/migrations/20260818100000_enquetes.sql via supabase-js. Mesmo
// contrato do demoEnqueteClient (src/lib/demoEnqueteClient.ts).
//
// Não testado contra um projeto Supabase ao vivo nesta sessão. Antes de ir a
// produção: aplicar a migration, gerar database.types.ts e trocar os `as
// any` por tipos gerados (mesma ressalva de supabaseClient.ts).

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ContagemRespostas,
  Enquete,
  EnquetePergunta,
  EnqueteResumo,
  LinhaDistribuicaoEnquete,
  PerguntaParticipante,
} from './types'
import type { EnqueteClient, NovaEnqueteInput } from './enqueteApi'

function mustClient(sb: SupabaseClient | null): SupabaseClient {
  if (!sb) {
    throw new Error(
      'Supabase não configurado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env local) ou use o modo demo.'
    )
  }
  return sb
}

export function makeSupabaseEnqueteClient(sb: SupabaseClient | null): EnqueteClient {
  return {
    async listarEnquetes(opts?: { todas?: boolean }) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_listar_enquetes', {
        p_todas: opts?.todas ?? false,
      })
      if (error) throw error
      return (data ?? []) as EnqueteResumo[]
    },

    async criarEnquete(input: NovaEnqueteInput) {
      const client = mustClient(sb)
      const { data: enquete, error: e1 } = await client
        .from('enquetes')
        .insert({
          professor_id: input.professorId,
          titulo: input.titulo,
          turma: input.turma,
        })
        .select()
        .single()
      if (e1) throw e1
      const linhas = input.perguntas.map((p, idx) => ({
        enquete_id: enquete.id,
        ordem: idx + 1,
        tipo: p.tipo,
        texto: p.texto,
        contexto: p.contexto,
        opcoes: p.opcoes,
      }))
      const { error: e2 } = await client.from('enquete_perguntas').insert(linhas)
      if (e2) throw e2
      return rowParaEnquete(enquete)
    },

    async abrirEnquete(enqueteId: string) {
      const client = mustClient(sb)
      const { data, error } = await client
        .from('enquetes')
        .update({ status: 'aberta', aberta_em: new Date().toISOString() })
        .eq('id', enqueteId)
        .select()
        .single()
      if (error) throw error
      return rowParaEnquete(data)
    },

    async listarPerguntas(enqueteId: string) {
      const client = mustClient(sb)
      const { data, error } = await client
        .from('enquete_perguntas')
        .select('*')
        .eq('enquete_id', enqueteId)
        .order('ordem')
      if (error) throw error
      return (data ?? []).map(rowParaPergunta)
    },

    async avancar(enqueteId: string) {
      // Duas chamadas, como avancar() em supabaseClient.ts — em produção
      // caberia uma RPC dedicada (rpc_avancar_pergunta) para atomicidade.
      const client = mustClient(sb)
      const { data: perguntas, error: e1 } = await client
        .from('enquete_perguntas')
        .select('*')
        .eq('enquete_id', enqueteId)
        .eq('estado', 'aguardando')
        .order('ordem')
        .limit(1)
      if (e1) throw e1
      const proxima = perguntas?.[0]
      if (!proxima) throw new Error('Não há próxima pergunta')
      const { data, error: e2 } = await client
        .from('enquete_perguntas')
        .update({ estado: 'aberta', aberta_em: new Date().toISOString() })
        .eq('id', proxima.id)
        .select()
        .single()
      if (e2) throw e2
      await client
        .from('enquetes')
        .update({ status: 'em_andamento', pergunta_atual: proxima.id })
        .eq('id', enqueteId)
      return rowParaPergunta(data)
    },

    async travar(perguntaId: string) {
      const client = mustClient(sb)
      const { error } = await client
        .from('enquete_perguntas')
        .update({ estado: 'travada', travada_em: new Date().toISOString() })
        .eq('id', perguntaId)
      if (error) throw error
    },

    async encerrarEnquete(enqueteId: string) {
      const client = mustClient(sb)
      const { data, error } = await client
        .from('enquetes')
        .update({ status: 'encerrada', encerrada_em: new Date().toISOString() })
        .eq('id', enqueteId)
        .select()
        .single()
      if (error) throw error
      return rowParaEnquete(data)
    },

    async contagemVotos(perguntaId: string): Promise<ContagemRespostas> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_contagem_votos', {
        p_pergunta_id: perguntaId,
      })
      if (error) throw error
      return data as ContagemRespostas
    },

    async contagemParticipantes(enqueteId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_contagem_participantes_enquete', {
        p_enquete_id: enqueteId,
      })
      if (error) throw error
      return data as number
    },

    async entrarEnquete(codigo: string, _participanteId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_entrar_enquete', { p_codigo: codigo })
      if (error) throw error
      return { enqueteId: data.enquete_id, status: data.status }
    },

    async votar(perguntaId: string, _participanteId: string, opcaoIndice: number) {
      const client = mustClient(sb)
      const { error } = await client.rpc('rpc_votar', {
        p_pergunta_id: perguntaId,
        p_opcao_indice: opcaoIndice,
      })
      if (error) throw error
    },

    async verPergunta(perguntaId: string, _viewerId: string): Promise<PerguntaParticipante> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_ver_pergunta', {
        p_pergunta_id: perguntaId,
      })
      if (error) throw error
      return data as PerguntaParticipante
    },

    async distribuicao(perguntaId: string): Promise<LinhaDistribuicaoEnquete[]> {
      const client = mustClient(sb)
      const { data, error } = await client.rpc('rpc_distribuicao_enquete', {
        p_pergunta_id: perguntaId,
      })
      if (error) throw error
      return data as LinhaDistribuicaoEnquete[]
    },

    async getEnquete(enqueteId: string) {
      const client = mustClient(sb)
      const { data, error } = await client.from('enquetes').select('*').eq('id', enqueteId).single()
      if (error) throw error
      return rowParaEnquete(data)
    },

    subscribeEnquete(enqueteId: string, onChange: () => void) {
      const client = mustClient(sb)
      const channel = client
        .channel(`enquete:${enqueteId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'enquetes', filter: `id=eq.${enqueteId}` },
          onChange
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'enquete_perguntas', filter: `enquete_id=eq.${enqueteId}` },
          onChange
        )
        .subscribe()
      return () => {
        client.removeChannel(channel)
      }
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowParaEnquete(row: any): Enquete {
  return {
    id: row.id,
    professor_id: row.professor_id,
    titulo: row.titulo,
    turma: row.turma,
    codigo: row.codigo,
    status: row.status,
    pergunta_atual: row.pergunta_atual,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowParaPergunta(row: any): EnquetePergunta {
  return {
    id: row.id,
    enquete_id: row.enquete_id,
    ordem: row.ordem,
    tipo: row.tipo,
    texto: row.texto,
    contexto: row.contexto,
    opcoes: row.opcoes,
    estado: row.estado,
  }
}
