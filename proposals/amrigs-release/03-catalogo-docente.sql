-- Catálogo docente do Treino AMRIGS (opção b, decisão do professor em 09/10/2026).
-- Professores e administração LEEM as questões AMRIGS já liberadas e suas
-- figuras, para consulta (gabarito, justificativas). NÃO podem registrar
-- tentativas: as políticas de escrita continuam exigindo aluno + matrícula,
-- então nada entra nos dados/estatísticas dos alunos.
-- PROPOSTA: aplicar só com autorização. Desfazer: 04-desfazer-catalogo-docente.sql.
begin;

-- Papel conferido no servidor (profiles.role), nunca por dado editável pelo usuário.
create function public.capi_amrigs_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role in ('professor', 'admin'));
$$;
revoke all on function public.capi_amrigs_staff() from public, anon;
grant execute on function public.capi_amrigs_staff() to authenticated;

-- Leitura das questões liberadas (mesmo recorte do aluno: AMRIGS, revisadas, visíveis).
create policy "staff reads released AMRIGS questions" on public.capi_training_questions
  for select to authenticated
  using (context = 'AMRIGS' and editorial_status = 'human_reviewed' and student_visible
         and (select public.capi_amrigs_staff()));

-- Manifesto das figuras (necessário para a regra do Storage abaixo).
create policy capi_image_manifest_staff on public.capi_amrigs_image_manifest
  for select to authenticated
  using ((select auth.uid()) is not null and (select public.capi_amrigs_staff()));

-- Storage: mesma guarda restritiva de antes; a única mudança é aceitar
-- "aluno com matrícula OU docente/admin" no lugar de só "aluno com matrícula".
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

-- Pós-condição: docentes não ganharam escrita em tentativas/sessões.
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('capi_training_attempts', 'capi_training_sessions')
             and coalesce(qual, '') || coalesce(with_check, '') like '%capi_amrigs_staff%') then
    raise exception 'Docente não pode gravar tentativas/sessões';
  end if;
end $$;

commit;
