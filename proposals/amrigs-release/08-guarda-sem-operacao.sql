-- Guarda das figuras SEM a condição storage.allow_only_operation(...).
-- Diagnóstico de 09/10/2026: com a guarda mínima (só usuário logado) o download
-- funcionou; a regra completa negava. Esta versão mantém: usuário logado,
-- aluno com matrícula OU docente/admin, figura com entrega liberada e usada por
-- questão AMRIGS liberada; leitura apenas (sem política de escrita; WITH CHECK
-- bloqueia gravação). Sem a condição de operação, quem já pode ver a figura
-- também poderia gerar um link temporário dela — risco aceito (páginas de
-- provas já publicadas).
begin;
drop policy capi_images_private_guard on storage.objects;
create policy capi_images_private_guard on storage.objects as restrictive
  for all to public
  using ((bucket_id <> 'capi-amrigs-private') or (
    ((select auth.uid()) is not null)
    and ((select public.capi_amrigs_authorized()) or (select public.capi_amrigs_staff()))
    and exists (
      select 1 from public.capi_amrigs_image_manifest m
      join public.capi_training_questions q
        on q.context = 'AMRIGS' and q.editorial_status = 'human_reviewed' and q.student_visible
      where m.delivery_enabled and m.object_name = storage.objects.name
        and exists (select 1 from jsonb_array_elements(
              case when jsonb_typeof(q.body -> 'images') = 'array' then q.body -> 'images' else '[]'::jsonb end) image(value)
            where (image.value ->> 'url') = '/amrigs/' || m.legacy_path))))
  with check (bucket_id <> 'capi-amrigs-private');
commit;
