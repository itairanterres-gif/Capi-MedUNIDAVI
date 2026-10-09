-- Restaura a guarda de figuras de 03-catalogo-docente.sql (desfaz 05).
begin;
drop policy capi_images_private_guard on storage.objects;
create policy capi_images_private_guard on storage.objects as restrictive
  for all to public
  using ((bucket_id <> 'capi-amrigs-private') or (
    ((select auth.uid()) is not null)
    and storage.allow_only_operation('object.get_authenticated')
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
