-- Grifo das pistas-chave (estilo AMBOSS) — lugar no banco.
-- Autorizado pelo Itairan em 09/10/2026. Desfazer: 02-desfazer-tabela-grifos.sql.
--
-- Separado da questão de propósito: o grifo só chega ao aluno DEPOIS que ele
-- respondeu (há tentativa dele para a questão). Docentes leem todos.
-- O navegador nunca grava aqui; a carga vem do pipeline (CLI, papel de dono).
begin;

create table public.capi_question_clues (
  -- AMRIGS: id da questão; ENAMED (ainda fora do Capi): 'enamed-<origem_indice>'
  question_key text primary key check (question_key ~ '^[A-Za-z0-9_-]{1,80}$'),
  question_id uuid references public.capi_training_questions(id) on delete cascade,
  context text not null check (context in ('AMRIGS', 'ENAMED')),
  -- SHA-256 do enunciado em que os trechos foram calculados: se a questão for
  -- editada, a tela não mostra grifo desalinhado.
  stem_sha256 text not null check (stem_sha256 ~ '^[0-9a-f]{64}$'),
  -- [{inicio, fim, trecho, porque}] — trechos literais do enunciado (1 a 3)
  clues jsonb not null check (jsonb_typeof(clues) = 'array' and jsonb_array_length(clues) between 1 and 3),
  model text not null,
  verifier text not null,
  status text not null default 'ativo' check (status in ('ativo', 'suspenso')),
  generated_at timestamptz not null default now(),
  unique (question_id)
);
comment on table public.capi_question_clues is
  'Pistas-chave pós-resposta (skill analise-questoes-residencia v1.3 §15A). Só o pipeline grava.';

alter table public.capi_question_clues enable row level security;
revoke all on public.capi_question_clues from anon, authenticated;
grant select on public.capi_question_clues to authenticated;

-- Aluno: só grifos ativos de questões AMRIGS liberadas que ele já respondeu.
create policy "learner reads clues after answering" on public.capi_question_clues
  for select to authenticated
  using (status = 'ativo' and question_id is not null
    and (select public.capi_amrigs_authorized())
    and exists (select 1 from public.capi_training_attempts a
                where a.question_id = capi_question_clues.question_id
                  and a.user_id = (select auth.uid())));

-- Docentes: todos os grifos (inclusive ENAMED ainda não migrado), para conferência.
create policy "staff reads all clues" on public.capi_question_clues
  for select to authenticated
  using ((select public.capi_amrigs_staff()));

commit;
