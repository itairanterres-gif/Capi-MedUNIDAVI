-- TESTE do envio de figuras com a conta de admin (10/10/2026). Não publicado,
-- invisível ao público; semestre 2099-1 para nunca entrar nas listas da XII.
-- Remover depois com remover-teste-envio-admin.sql.
begin;
insert into public.matriculas (email, nome, turma, fase, situacao, semestre)
values ('itairan.terres@unidavi.edu.br', 'Itairan (TESTE do SAM)', 'TESTE', 7, 'Ativo', '2099-1')
on conflict (email) do nothing;
insert into public.sam_trabalhos (edicao_id, codigo, apresentador_email, apresentador_nome, fase, modalidade)
values ('xii', 'F7-TESTE', 'itairan.terres@unidavi.edu.br', 'Itairan (TESTE do SAM)', 7, 'poster_tc1')
on conflict (edicao_id, apresentador_email) do nothing;
select codigo, status, fase from public.sam_trabalhos where codigo = 'F7-TESTE';
commit;
