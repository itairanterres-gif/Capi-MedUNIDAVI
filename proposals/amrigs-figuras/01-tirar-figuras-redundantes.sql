-- Tira a figura de 10 questões AMRIGS em que ela só repetia o texto do enunciado
-- (revisão visual do Codex: text_sufficient). Colunas e afirmativas passam a
-- aparecer em linhas próprias pela tela (stemDisplay). Desfazer: 02-desfazer-figuras-redundantes.sql.
begin;
update public.capi_training_questions set body = jsonb_set(body, '{images}', '[]'::jsonb)
where context = 'AMRIGS' and id in ('efa5a06b-83ea-53df-8b1e-7a67fe5d22c2'::uuid, '65bb3a15-d18f-520e-b1cd-0fc26ed76187'::uuid, '602f5961-4050-5ec4-8e04-2bcd68968dc7'::uuid, '9a31860e-0ffa-51b8-b4bc-f6cb71f6e927'::uuid, 'aee5fbd7-d612-51b6-846b-7249b6720d73'::uuid, '2992fa8f-e935-5d4d-a44d-dca14af0492c'::uuid, 'd1e07e3e-7219-525d-979f-72f8fa697375'::uuid, 'b06ee9f9-a467-5bdb-9ba6-b9c9b64f84ec'::uuid, '4ec3699a-d03f-58a0-8b1f-b2dd25d6086f'::uuid, '2d71e23e-bb40-5abd-8aa5-055b5b1b60b2'::uuid)
  and jsonb_array_length(body->'images') = 1;
select body->>'source' as questao, jsonb_array_length(body->'images') as figuras from public.capi_training_questions where id in ('efa5a06b-83ea-53df-8b1e-7a67fe5d22c2'::uuid, '65bb3a15-d18f-520e-b1cd-0fc26ed76187'::uuid, '602f5961-4050-5ec4-8e04-2bcd68968dc7'::uuid, '9a31860e-0ffa-51b8-b4bc-f6cb71f6e927'::uuid, 'aee5fbd7-d612-51b6-846b-7249b6720d73'::uuid, '2992fa8f-e935-5d4d-a44d-dca14af0492c'::uuid, 'd1e07e3e-7219-525d-979f-72f8fa697375'::uuid, 'b06ee9f9-a467-5bdb-9ba6-b9c9b64f84ec'::uuid, '4ec3699a-d03f-58a0-8b1f-b2dd25d6086f'::uuid, '2d71e23e-bb40-5abd-8aa5-055b5b1b60b2'::uuid) order by 1;
commit;
