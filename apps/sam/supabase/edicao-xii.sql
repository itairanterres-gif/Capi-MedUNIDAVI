-- Edição XII (23 a 27/11/2026) e um trabalho por aluno da 7ª (pôster TC1) e da
-- 8ª fase (oral TC2) do semestre 2026-2. Idempotente. Rodar como dono (CLI):
-- é o mesmo que sam_criar_trabalhos_da_edicao faz para a curadoria.
begin;
insert into public.sam_edicoes (id, numero, nome, data_inicio, data_fim, local, semestre, status)
values ('xii', 12, 'Semana Acadêmica da Medicina UNIDAVI', '2026-11-23', '2026-11-27',
        'Auditório Célio Simão Martignago', '2026-2', 'preparacao')
on conflict (id) do nothing;
insert into public.sam_trabalhos (edicao_id, codigo, apresentador_email, apresentador_nome, fase, modalidade)
select 'xii', 'F' || m.fase || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
       lower(m.email), m.nome, m.fase, case m.fase when 7 then 'poster_tc1' else 'oral_tc2' end
from public.matriculas m
where m.semestre = '2026-2' and m.fase in (7, 8)
on conflict (edicao_id, apresentador_email) do nothing;
select fase, modalidade, count(*) as trabalhos from public.sam_trabalhos where edicao_id = 'xii' group by 1, 2 order by 1;
commit;
