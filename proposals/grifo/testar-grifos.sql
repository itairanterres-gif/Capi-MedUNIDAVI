-- Teste de acesso aos grifos. Rodar SEMPRE em transação desfeita, depois de 01:
--   begin; \i 01 (sem begin/commit) ; \i testar-grifos.sql; rollback;
-- Usa a primeira questão AMRIGS liberada e um aluno fictício matriculado.
create temp table _t (k text primary key, v uuid);
grant all on _t to authenticated;
insert into _t values ('q', (select id from public.capi_training_questions where context='AMRIGS' and student_visible limit 1)),
                      ('aluno', gen_random_uuid());
insert into auth.users (id, email, aud, role) select v, 'grifo.teste@example.invalid', 'authenticated', 'authenticated' from _t where k='aluno';
insert into public.profiles (id, nome, email, role) select v, 'Aluno Grifo Teste', 'grifo.teste@example.invalid', 'aluno' from _t where k='aluno'
  on conflict (id) do update set role='aluno', email=excluded.email;
insert into public.matriculas (email, situacao) values ('grifo.teste@example.invalid', 'Ativo') on conflict do nothing;
insert into public.capi_question_clues (question_key, question_id, context, stem_sha256, clues, model, verifier)
  select v::text, v, 'AMRIGS', repeat('a', 64), '[{"inicio":0,"fim":3,"trecho":"x","porque":"y"}]', 'm', 'v' from _t where k='q';
insert into public.capi_question_clues (question_key, question_id, context, stem_sha256, clues, model, verifier)
  values ('enamed-1', null, 'ENAMED', repeat('b', 64), '[{"inicio":0,"fim":3,"trecho":"x","porque":"y"}]', 'm', 'v');

select set_config('request.jwt.claims', json_build_object('sub', (select v from _t where k='aluno'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.capi_question_clues) <> 0 then raise exception 'aluno viu grifo antes de responder'; end if;
  raise notice 'OK 1 aluno não vê grifo antes de responder';
end $$;
reset role;
insert into public.capi_training_attempts (user_id, question_id, answer, is_correct)
  select (select v from _t where k='aluno'), v, 'A', false from _t where k='q';
set local role authenticated;
do $$ begin
  if (select count(*) from public.capi_question_clues) <> 1 then raise exception 'aluno não viu o grifo da questão respondida'; end if;
  if exists (select 1 from public.capi_question_clues where context='ENAMED') then raise exception 'aluno viu ENAMED'; end if;
  begin insert into public.capi_question_clues (question_key, context, stem_sha256, clues, model, verifier)
    values ('x', 'AMRIGS', repeat('c',64), '[{"a":1}]', 'm', 'v'); raise exception 'aluno gravou grifo';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 2 aluno vê só o grifo da questão respondida e não grava';
end $$;
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$ begin
  begin perform 1 from public.capi_question_clues; raise exception 'visitante leu grifos';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 3 visitante não lê grifos';
end $$;
reset role;
