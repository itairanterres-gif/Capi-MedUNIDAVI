-- Testes de acesso do SAM. Rodar SEMPRE dentro de transação desfeita:
--   begin; \i 20261008120000_sam_xii.sql; \i testes_acesso_sam.sql; rollback;
-- Usa só pessoas fictícias (@example.invalid). Cada verificação imprime OK
-- ou interrompe com erro.

create temp table _ids (nome text primary key, id uuid);
grant all on _ids to anon, authenticated;

-- A stack local de homologação tem public.matriculas reduzida (email, situacao).
-- As migrations da Sessão (20260730400000_alunos_senha.sql) definem também
-- nome/turma/fase/semestre; completa-se aqui só dentro da transação de teste.
alter table public.matriculas add column if not exists nome text,
  add column if not exists turma text, add column if not exists fase integer,
  add column if not exists semestre text;

-- Pessoas fictícias: aluna da 7ª (A), aluno da 8ª (B), curadora (C).
insert into _ids values ('A', gen_random_uuid()), ('B', gen_random_uuid()), ('C', gen_random_uuid());
insert into auth.users (id, email, aud, role)
  select id, lower(nome) || '.sam@example.invalid', 'authenticated', 'authenticated' from _ids;
-- Papel por literal (em produção role é um tipo próprio; no local, texto).
insert into public.profiles (id, nome, email, role)
  select id, 'Fictício ' || nome, lower(nome) || '.sam@example.invalid', 'aluno' from _ids
  on conflict (id) do update set role = excluded.role, email = excluded.email;
update public.profiles set role = 'professor' where id = (select id from _ids where nome = 'C');
insert into public.matriculas (email, nome, turma, fase, situacao, semestre) values
  ('a.sam@example.invalid', 'Aluna Fictícia A', 'TX', 7, 'Ativo', '2099-2'),
  ('b.sam@example.invalid', 'Aluno Fictício B', 'TX', 8, 'Pré-Matrícula', '2099-2'),  -- conta como matriculado
  ('d.sam@example.invalid', 'Aluno Fictício D', 'TX', 6, 'Ativo', '2099-2');          -- 6ª fase: fora do SAM
insert into public.sam_edicoes (id, numero, nome, data_inicio, data_fim, semestre)
  values ('zzteste', 99, 'Edição de teste', '2099-11-23', '2099-11-27', '2099-2');
insert into public.sam_curadores (email) values ('c.sam@example.invalid');

create function pg_temp.como(quem text) returns void language plpgsql as $$
begin
  if quem = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', (select id from _ids where nome = quem), 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end $$;

-- 1. Curadoria cria um trabalho por aluno da 7ª e 8ª do semestre.
select pg_temp.como('C');
do $$ begin
  if public.sam_criar_trabalhos_da_edicao('zzteste') <> 2 then raise exception 'esperava 2 trabalhos'; end if;
  if public.sam_criar_trabalhos_da_edicao('zzteste') <> 0 then raise exception 'não é idempotente'; end if;
  insert into _ids select 'TB', id from public.sam_trabalhos where edicao_id = 'zzteste' and fase = 8;
  raise notice 'OK 1 curadoria cria 2 trabalhos, idempotente';
end $$;
reset role;

-- 2. Visitante não vê trabalho não publicado nem o e-mail.
select pg_temp.como('anon');
do $$ begin
  if (select count(*) from public.sam_trabalhos where edicao_id = 'zzteste') <> 0 then raise exception 'visitante viu não publicado'; end if;
  begin perform apresentador_email from public.sam_trabalhos limit 1; raise exception 'visitante leu e-mail';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 2 visitante: nada não publicado, e-mail bloqueado';
end $$;
reset role;

-- 3. Aluna A salva o próprio trabalho (com autores no formato da XI); não mexe no de B.
select pg_temp.como('A');
do $$ declare meu uuid; outro uuid; begin
  select id into meu from public.sam_trabalhos where edicao_id = 'zzteste' and fase = 7;
  if meu is null then raise exception 'A não vê o próprio trabalho'; end if;
  perform public.sam_salvar_trabalho(meu, '{"titulo":"Projeto fictício","autores":["Orientadora Fictícia","Coautor Fictício"],"palavras":["teste"]}');
  select id into outro from public.sam_trabalhos where edicao_id = 'zzteste' and fase = 8;
  if outro is not null then raise exception 'A viu trabalho de B'; end if;
  begin
    perform public.sam_salvar_trabalho((select id from _ids where nome = 'TB'), '{}');
    raise exception 'A alterou trabalho alheio';
  exception when raise_exception then
    if sqlerrm not like 'Sem acesso%' then raise; end if;
  end;
  begin perform apresentador_email from public.sam_trabalhos limit 1; raise exception 'aluna leu e-mail';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 3 aluna salva o seu, não vê/edita o alheio, sem e-mail';
end $$;
reset role;

-- 4. Aluna não publica; curadoria publica.
select pg_temp.como('A');
do $$ begin
  perform public.sam_decidir_curadoria((select id from public.sam_trabalhos where edicao_id = 'zzteste'), 'publicado', null);
  raise exception 'aluna publicou';
exception when raise_exception then
  if sqlerrm not like 'Somente curadoria%' then raise; end if;
  raise notice 'OK 4a aluna não publica';
end $$;
reset role;
select pg_temp.como('C');
do $$ declare t uuid; begin
  select id into t from public.sam_trabalhos where edicao_id = 'zzteste' and fase = 7;
  begin perform public.sam_decidir_curadoria(t, 'ajuste', '');
    raise exception 'ajuste sem comentário aceito';
  exception when raise_exception then if sqlerrm not like 'Comentário obrigatório%' then raise; end if; end;
  perform public.sam_decidir_curadoria(t, 'publicado', null);
  if (select email from public.sam_contato_apresentador(t)) <> 'a.sam@example.invalid' then raise exception 'contato errado'; end if;
  raise notice 'OK 4b curadoria publica e vê contato';
end $$;
reset role;

-- 5. Visitante vê o publicado, os nomes dos autores, avalia; não lê avaliações.
select pg_temp.como('anon');
do $$ declare t uuid; begin
  select id into t from public.sam_trabalhos where edicao_id = 'zzteste';
  if t is null then raise exception 'publicado invisível'; end if;
  if (select count(*) from public.sam_trabalho_autores where trabalho_id = t) <> 2 then raise exception 'autores não visíveis'; end if;
  insert into public.sam_apreciacoes (trabalho_id, tipo_apreciador, tipo_tc, nome_visitante, respostas)
    values (t, 'visitante', 'TC1', 'Visitante Fictício', '{"global":{"valor":5}}');
  begin insert into public.sam_apreciacoes (trabalho_id, tipo_apreciador, tipo_tc, user_id, respostas)
    values (t, 'docente', 'TC1', gen_random_uuid(), '{}'); raise exception 'visitante se passou por docente';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.sam_apreciacoes; raise exception 'visitante leu avaliações';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 5 visitante vê publicado e autores, avalia, não lê avaliações';
end $$;
reset role;

-- 6. Aluno B não avalia como docente; avalia como aluno uma vez; curadoria lê.
select pg_temp.como('B');
do $$ declare t uuid; me uuid := (select id from _ids where nome = 'B'); begin
  select id into t from public.sam_trabalhos where edicao_id = 'zzteste' and status = 'publicado';
  begin insert into public.sam_apreciacoes (trabalho_id, tipo_apreciador, tipo_tc, user_id, respostas)
    values (t, 'docente', 'TC1', me, '{}'); raise exception 'aluno avaliou como docente';
  exception when insufficient_privilege then null; end;
  insert into public.sam_apreciacoes (trabalho_id, tipo_apreciador, tipo_tc, user_id, respostas)
    values (t, 'aluno', 'TC1', me, '{}');
  begin insert into public.sam_apreciacoes (trabalho_id, tipo_apreciador, tipo_tc, user_id, respostas)
    values (t, 'aluno', 'TC1', me, '{}'); raise exception 'avaliou duas vezes';
  exception when unique_violation then null; end;
  if (select count(*) from public.sam_apreciacoes) <> 0 then raise exception 'aluno leu avaliações'; end if;
  raise notice 'OK 6 aluno: não vira docente, uma avaliação, não lê avaliações';
end $$;
reset role;
select pg_temp.como('C');
do $$ begin
  if (select count(*) from public.sam_apreciacoes a join public.sam_trabalhos t on t.id = a.trabalho_id
      where t.edicao_id = 'zzteste') <> 2 then raise exception 'curadoria não lê avaliações'; end if;
  raise notice 'OK 7 curadoria lê as 2 avaliações';
end $$;
reset role;

-- 8. Publicado não volta a ser editado pela aluna.
select pg_temp.como('A');
do $$ begin
  perform public.sam_salvar_trabalho((select id from public.sam_trabalhos where edicao_id = 'zzteste'), '{"titulo":"x"}');
  raise exception 'publicado foi alterado';
exception when raise_exception then
  if sqlerrm not like 'Trabalho publicado%' then raise; end if;
  raise notice 'OK 8 publicado bloqueado para edição da aluna';
end $$;
reset role;

-- 9. Programa: curadoria edita, aluno não; visitante lê.
select pg_temp.como('C');
insert into public.sam_programa (edicao_id, dia, bloco, ordem, hora, apresentador, trabalho_id)
  select 'zzteste', '2099-11-23', 'poster', 'P1', null, 'Aluna Fictícia A', id
  from public.sam_trabalhos where edicao_id = 'zzteste' and fase = 7;
reset role;
select pg_temp.como('B');
do $$ begin
  insert into public.sam_programa (edicao_id, dia, bloco, ordem) values ('zzteste', '2099-11-24', 'oral', 'TC1');
  raise exception 'aluno editou o programa';
exception when insufficient_privilege then raise notice 'OK 9a aluno não edita o programa';
end $$;
reset role;
select pg_temp.como('anon');
do $$ begin
  if (select count(*) from public.sam_programa where edicao_id = 'zzteste') <> 1 then raise exception 'programa invisível'; end if;
  raise notice 'OK 9b visitante lê o programa';
end $$;
reset role;

-- 12. "Meu trabalho": o aluno recebe só o dele; a curadora (que lê todos) nenhum.
select pg_temp.como('B');
do $$ begin
  if public.sam_meu_trabalho('zzteste') is distinct from (select id from _ids where nome = 'TB') then raise exception 'aluno não recebeu o próprio trabalho'; end if;
  raise notice 'OK 12a aluno recebe o próprio trabalho';
end $$;
reset role;
select pg_temp.como('C');
do $$ begin
  if public.sam_meu_trabalho('zzteste') is not null then raise exception 'curadora recebeu trabalho alheio como seu'; end if;
  raise notice 'OK 12b curadora não recebe trabalho alheio como seu';
end $$;
reset role;
select pg_temp.como('anon');
do $$ begin
  perform public.sam_meu_trabalho('zzteste'); raise exception 'visitante executou sam_meu_trabalho';
exception when insufficient_privilege then raise notice 'OK 12c visitante não executa';
end $$;
reset role;
