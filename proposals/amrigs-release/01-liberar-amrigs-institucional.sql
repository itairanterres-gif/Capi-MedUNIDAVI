-- Liberação institucional do Treino AMRIGS — Supabase canônico (ggjxbumtnizaeomioves).
-- PROPOSTA: aplicar somente com autorização explícita do responsável e após backup.
-- Decisão (09/10/2026): disponível a TODO aluno com matrícula (helper já aplicado
-- capi_amrigs_authorized() = profiles.role 'aluno' + matrícula). Revisão
-- pedagógica dos itens já concluída pelo professor (não reaberta aqui).
-- Desfazer: 02-desfazer-liberacao-amrigs.sql.
begin;

-- 1. Pré-condições: o estado precisa ser exatamente o registrado em 07/10
--    (477 rascunhos invisíveis, 31 figuras no manifesto, nenhuma entrega ativa).
do $$
declare total int; rascunhos int; visiveis int; figuras int; entregues int;
begin
  select count(*),
         count(*) filter (where editorial_status = 'draft' and not student_visible),
         count(*) filter (where student_visible)
    into total, rascunhos, visiveis
    from public.capi_training_questions where context = 'AMRIGS';
  select count(*), count(*) filter (where delivery_enabled) into figuras, entregues
    from public.capi_amrigs_image_manifest;
  if total <> 477 or rascunhos <> 477 or visiveis <> 0 or figuras <> 31 or entregues <> 0 then
    raise exception 'Estado inesperado (questões %, rascunhos %, visíveis %, figuras %, entregues %): nada alterado',
      total, rascunhos, visiveis, figuras, entregues;
  end if;
  if exists (select 1 from public.capi_training_questions where context <> 'AMRIGS' and student_visible) then
    raise exception 'Há questões de outro contexto visíveis: conferir antes (ENAMED segue reservado)';
  end if;
end $$;

-- 2. Liberar as 477 questões (somente o contexto AMRIGS).
update public.capi_training_questions
   set editorial_status = 'human_reviewed', student_visible = true
 where context = 'AMRIGS' and editorial_status = 'draft' and not student_visible;

-- 3. Liberar a entrega das 31 figuras. Cada figura só é entregue se a(s)
--    questão(ões) que a usam estiverem liberadas (política capi_images_private_guard).
update public.capi_amrigs_image_manifest set delivery_enabled = true where not delivery_enabled;

-- 4. Pós-condições: tudo liberado e toda figura usada por ao menos uma questão liberada.
do $$
declare visiveis int; entregues int; orfas int;
begin
  select count(*) into visiveis from public.capi_training_questions
   where context = 'AMRIGS' and editorial_status = 'human_reviewed' and student_visible;
  select count(*) into entregues from public.capi_amrigs_image_manifest where delivery_enabled;
  select count(*) into orfas from public.capi_amrigs_image_manifest m
   where not exists (
     select 1 from public.capi_training_questions q,
            jsonb_array_elements(case when jsonb_typeof(q.body->'images') = 'array' then q.body->'images' else '[]'::jsonb end) img
      where q.context = 'AMRIGS' and q.student_visible and img->>'url' = '/amrigs/' || m.legacy_path);
  if visiveis <> 477 or entregues <> 31 or orfas <> 0 then
    raise exception 'Pós-condição falhou (visíveis %, figuras %, figuras sem questão %): desfeito', visiveis, entregues, orfas;
  end if;
  if exists (select 1 from public.capi_training_questions where context <> 'AMRIGS' and student_visible) then
    raise exception 'Outro contexto ficou visível: desfeito';
  end if;
end $$;

commit;
