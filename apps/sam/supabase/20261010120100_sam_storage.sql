-- SAM · Storage (só produção: a pilha local de homologação não tem Storage).
-- Bucket sam-figuras PÚBLICO para leitura: o site do SAM é público e mostra
-- figuras de trabalhos publicados sem login. Os nomes são <id-do-trabalho>/<arquivo
-- aleatório>; o id só é público para trabalhos publicados. Escrita só do
-- autor (trabalho não publicado) ou da curadoria, na pasta do próprio trabalho.
-- Sem checagem de storage.operation: ela derrubou os downloads do AMRIGS.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sam-figuras', 'sam-figuras', true, 2621440, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2621440,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

create function public.sam_pode_escrever_arquivo(nome text) returns boolean
language sql stable security definer set search_path = '' as $$
  select nome ~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,80}$'
     and exists (select 1 from public.sam_trabalhos w
                 where w.id::text = split_part(nome, '/', 1)
                   and ((public.sam_eh_autor(w.id) and w.status <> 'publicado') or public.sam_eh_curador()));
$$;
revoke all on function public.sam_pode_escrever_arquivo(text) from public, anon;
grant execute on function public.sam_pode_escrever_arquivo(text) to authenticated;

-- Listar (para limpar o que sobrou) e enviar/apagar: mesma regra.
create policy sam_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'sam-figuras' and public.sam_pode_escrever_arquivo(name));
create policy sam_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'sam-figuras' and public.sam_pode_escrever_arquivo(name));
create policy sam_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'sam-figuras' and public.sam_pode_escrever_arquivo(name));

commit;
