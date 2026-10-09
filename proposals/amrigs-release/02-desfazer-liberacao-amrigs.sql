-- Desfaz a liberação institucional do Treino AMRIGS: volta ao estado de 07/10
-- (477 rascunhos invisíveis, nenhuma figura entregue). NÃO apaga tentativas,
-- sessões ou cadernos dos alunos: o histórico é preservado e volta a aparecer
-- se a liberação for refeita.
begin;

update public.capi_amrigs_image_manifest set delivery_enabled = false where delivery_enabled;

update public.capi_training_questions
   set editorial_status = 'draft', student_visible = false
 where context = 'AMRIGS' and (editorial_status <> 'draft' or student_visible);

do $$
begin
  if exists (select 1 from public.capi_training_questions where context = 'AMRIGS' and (student_visible or editorial_status <> 'draft'))
     or exists (select 1 from public.capi_amrigs_image_manifest where delivery_enabled) then
    raise exception 'Desfazer incompleto';
  end if;
end $$;

commit;
