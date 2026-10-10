-- Remove o trabalho e a matrícula de TESTE do admin (figuras registradas vão junto).
-- Os arquivos no bucket sam-figuras da pasta desse trabalho se apagam pela API do Storage.
begin;
delete from public.sam_trabalhos where edicao_id = 'xii' and codigo = 'F7-TESTE';
delete from public.matriculas where email = 'itairan.terres@unidavi.edu.br' and semestre = '2099-1' and turma = 'TESTE';
select (select count(*) from public.sam_trabalhos where edicao_id = 'xii') as trabalhos_xii;
commit;
