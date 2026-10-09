-- TESTE TEMPORÁRIO (autorizado pelo professor em 09/10/2026): guarda mínima
-- das figuras = qualquer usuário logado, só leitura. Restaurar com 06.
begin;
drop policy capi_images_private_guard on storage.objects;
create policy capi_images_private_guard on storage.objects as restrictive
  for all to public
  using ((bucket_id <> 'capi-amrigs-private') or ((select auth.uid()) is not null))
  with check (bucket_id <> 'capi-amrigs-private');
commit;
