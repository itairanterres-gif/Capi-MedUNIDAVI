-- Desfaz 01-tabela-grifos.sql (remove a tabela, as políticas e os grifos).
-- Os grifos podem ser recarregados de output/grifos/ com gerar-carga.mjs.
begin;
drop table if exists public.capi_question_clues;
commit;
