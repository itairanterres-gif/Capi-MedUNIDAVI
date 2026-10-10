-- Curadoras da XII SAM (e-mails informados pelo Itairan em 10/10/2026).
-- sam_curadores: vira curadora ao criar a conta Capi com esse e-mail.
-- professores_autorizados: libera "Criar minha conta" como docente (papel professor).
begin;
insert into public.sam_curadores (email) values
  ('franciani@unidavi.edu.br'), ('samantha.lopes@unidavi.edu.br'), ('alinne.petris@unidavi.edu.br')
on conflict (email) do nothing;
insert into public.professores_autorizados (email, nome_sugerido, observacao) values
  ('franciani@unidavi.edu.br', 'Franciani Rodrigues da Rocha', 'Curadoria XII SAM (autorizado em 10/10/2026)'),
  ('samantha.lopes@unidavi.edu.br', 'Samantha Cristiane Lopes', 'Curadoria XII SAM (autorizado em 10/10/2026)'),
  ('alinne.petris@unidavi.edu.br', 'Alinne Petris', 'Curadoria XII SAM (autorizado em 10/10/2026)')
on conflict (email) do nothing;
select (select count(*) from public.sam_curadores) as curadoras, (select count(*) from public.professores_autorizados) as docentes_autorizados;
commit;
