-- Alunos da 7ª/8ª fase dispensados de apresentar numa edição (ex.: já aprovados
-- no TC por apresentação anterior). sam_criar_trabalhos_da_edicao não cria
-- trabalho para quem está aqui, mesmo se a função for rodada de novo.
begin;
create table if not exists public.sam_dispensados (
  edicao_id text not null references public.sam_edicoes(id),
  email text not null check (email = lower(email)),
  motivo text not null,
  criado_em timestamptz not null default now(),
  primary key (edicao_id, email)
);
alter table public.sam_dispensados enable row level security;
revoke all on public.sam_dispensados from anon, authenticated;

create or replace function public.sam_criar_trabalhos_da_edicao(e text) returns integer
language plpgsql security definer set search_path = '' as $$
declare criados integer;
begin
  if not public.sam_eh_curador() then raise exception 'Somente curadoria'; end if;
  with novos as (
    insert into public.sam_trabalhos (edicao_id, codigo, apresentador_email, apresentador_nome, fase, modalidade)
    select ed.id, 'F' || m.fase || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
           lower(m.email), m.nome, m.fase, case m.fase when 7 then 'poster_tc1' else 'oral_tc2' end
    from public.sam_edicoes ed join public.matriculas m on m.semestre = ed.semestre
    where ed.id = e and m.fase in (7, 8)
      and not exists (select 1 from public.sam_dispensados d where d.edicao_id = ed.id and d.email = lower(m.email))
    on conflict (edicao_id, apresentador_email) do nothing
    returning id
  )
  select count(*) into criados from novos;
  return criados;
end $$;
revoke all on function public.sam_criar_trabalhos_da_edicao(text) from public, anon;
grant execute on function public.sam_criar_trabalhos_da_edicao(text) to authenticated;

-- XII: aluna da 8ª fase (T12) com reprovação em outra disciplina, aprovada em TC
-- na XI; não apresenta de novo (informado pelo Itairan em 10/10/2026).
insert into public.sam_dispensados (edicao_id, email, motivo)
select 'xii', lower(m.email), 'Aprovada no TC na XI; não apresenta de novo na XII'
from public.matriculas m where m.semestre = '2026-2' and m.fase = 8 and m.matricula is null and m.nome = 'Isadora Rosa Mergener de Bortolo'
on conflict do nothing;
delete from public.sam_trabalhos w using public.sam_dispensados d
 where w.edicao_id = d.edicao_id and lower(w.apresentador_email) = d.email and d.edicao_id = 'xii';

select (select count(*) from public.sam_dispensados where edicao_id = 'xii') as dispensados,
       (select count(*) from public.sam_trabalhos where edicao_id = 'xii') as trabalhos_xii,
       (select count(*) from public.sam_trabalhos where edicao_id = 'xii' and fase = 8) as fase8,
       (select count(*) from public.sam_programa where edicao_id = 'xii') as programa;
commit;
