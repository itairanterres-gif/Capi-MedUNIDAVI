-- Desfaz 20261010120000_sam_figuras.sql e 20261010120100_sam_storage.sql.
-- Os arquivos já enviados ao bucket NÃO são apagados por este script.
begin;
drop policy if exists sam_arquivos_ler on storage.objects;
drop policy if exists sam_arquivos_enviar on storage.objects;
drop policy if exists sam_arquivos_apagar on storage.objects;
drop function if exists public.sam_pode_escrever_arquivo(text) cascade;
drop function if exists public.sam_salvar_figuras(uuid, jsonb, text) cascade;
create policy sam_figuras_autor on public.sam_figuras for all to authenticated
  using (public.sam_eh_autor(trabalho_id)
         and exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status <> 'publicado'))
  with check (public.sam_eh_autor(trabalho_id)
         and exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status <> 'publicado'));
grant insert, update, delete on public.sam_figuras to authenticated;
commit;
-- O bucket (public.storage.buckets, id 'sam-figuras') se remove pelo painel ou
-- pela API do Storage depois de esvaziado.
