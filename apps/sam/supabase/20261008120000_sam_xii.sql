-- PROPOSTA — não aplicada em nenhum banco.
-- SAM (Semana Acadêmica da Medicina) no Supabase canônico do Capi (projeto da
-- Sessão). Substitui o Google Apps Script + planilha. Primeiro alvo: stack
-- local de homologação; produção exige revisão e autorização próprias.
--
-- Decisões do professor em 08/10/2026:
-- - login do SAM = login do Capi (auth.users + public.profiles);
-- - não há inscrição: todo aluno da 7ª fase apresenta pôster (TC1) e todo
--   aluno da 8ª faz apresentação oral (TC2); os trabalhos nascem da lista de
--   alunos (public.matriculas);
-- - visitantes avaliam sem login pelo site público;
-- - podcast, flashcards e quiz são gerados por pipeline de IA, que grava só
--   links/conteúdo em sam_materiais (arquivos pesados fora do Storage).
-- Edições I–XI continuam como JSON estático no site; só a XII em diante usa
-- estas tabelas.

create table public.sam_edicoes (
  id text primary key check (id ~ '^[a-z]+$'),            -- 'xii'
  numero integer not null unique check (numero > 0),
  nome text not null,
  data_inicio date not null,
  data_fim date not null check (data_fim >= data_inicio),
  local text,
  semestre text not null check (semestre ~ '^[0-9]{4}-[12]$'),
  status text not null default 'preparacao'
    check (status in ('preparacao', 'em_andamento', 'encerrada')),
  criado_em timestamptz not null default now()
);

create table public.sam_trabalhos (
  id uuid primary key default gen_random_uuid(),
  edicao_id text not null references public.sam_edicoes(id),
  codigo text not null,                                     -- ex.: F8-8CE8, exibido no site
  -- Um trabalho por aluno apresentador (autor do projeto), vindo da matrícula.
  -- Só ele edita. Demais autores ficam em sam_trabalho_autores, só com nome.
  apresentador_email text not null references public.matriculas(email),
  apresentador_nome text not null,
  fase integer not null check (fase in (7, 8)),
  modalidade text not null check (modalidade in ('poster_tc1', 'oral_tc2')),
  check ((fase = 7 and modalidade = 'poster_tc1') or (fase = 8 and modalidade = 'oral_tc2')),
  -- pendente: aguardando o aluno; enviado: aguardando curadoria;
  -- ajuste: devolvido com comentário; publicado: visível no site público.
  status text not null default 'pendente'
    check (status in ('pendente', 'enviado', 'ajuste', 'publicado')),
  titulo text not null default '',
  desenho text,
  area text,
  orientador_id uuid references public.profiles(id),        -- vínculo opcional ao docente; nome vai em autores
  prof_uc text,                                             -- professor da UC (campo profUc da XI SAM)
  afiliacao text,
  introducao text,
  objetivos text,
  metodos text,
  resultados text,
  conclusao text,
  resumo_completo text,                                     -- só 8ª fase
  palavras text[] not null default '{}',
  referencias text,
  fig_principal integer check (fig_principal between 1 and 4),
  foto_autores_path text,                                   -- Storage: sam-figuras
  ajuste_layout jsonb,                                      -- {v:3, colunas, figuras}
  slides_url text,
  comentario_curadoria text,
  dia date,
  horario text,
  estacao integer,
  enviado_em timestamptz,
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (edicao_id, codigo),
  unique (edicao_id, apresentador_email)
);

-- Autoria científica exibida no pôster e no site, no padrão da XI SAM:
-- o apresentador é o "autor" (sam_trabalhos.apresentador_nome) e esta tabela
-- é a lista "autores" (demais nomes, na ordem). Papel é opcional — a XI não o
-- distingue. Somente nomes (públicos com permissão); nenhum e-mail ou conta.
create table public.sam_trabalho_autores (
  trabalho_id uuid not null references public.sam_trabalhos(id) on delete cascade,
  ordem integer not null check (ordem > 0),
  nome text not null check (length(trim(nome)) > 0),
  papel text not null default 'autor' check (papel in ('autor', 'orientador', 'coorientador')),
  primary key (trabalho_id, ordem)
);

create table public.sam_figuras (
  id uuid primary key default gen_random_uuid(),
  trabalho_id uuid not null references public.sam_trabalhos(id) on delete cascade,
  ordem integer not null check (ordem between 1 and 4),
  secao text not null check (secao in ('Introdução', 'Métodos', 'Resultados', 'Discussão', 'Outra')),
  titulo text,
  legenda text,
  storage_path text not null,                               -- Storage: sam-figuras
  unique (trabalho_id, ordem)
);

create table public.sam_materiais (
  trabalho_id uuid primary key references public.sam_trabalhos(id) on delete cascade,
  podcast_url text,
  flashcards_url text,
  flashcards_texto text,                                    -- CSV pergunta;resposta, como na XI
  quiz jsonb,                                               -- [{pergunta, alternativas, correta, explicacao}]
  link_artigo text,
  publicacao text,
  origem text not null default 'ia_automatica' check (origem in ('ia_automatica', 'manual')),
  gerado_em timestamptz,
  revisado_por uuid references public.profiles(id),
  revisado_em timestamptz
);

create table public.sam_apreciacoes (
  id uuid primary key default gen_random_uuid(),
  trabalho_id uuid not null references public.sam_trabalhos(id) on delete cascade,
  tipo_apreciador text not null check (tipo_apreciador in ('docente', 'aluno', 'visitante')),
  tipo_tc text not null check (tipo_tc in ('TC1', 'TC2')),
  user_id uuid references public.profiles(id),
  nome_visitante text,
  -- docente/aluno sempre identificados; visitante anônimo, nome opcional
  -- (como no Apps Script da XI, tipo "outro").
  check ((tipo_apreciador = 'visitante' and user_id is null)
      or (tipo_apreciador <> 'visitante' and user_id is not null and nome_visitante is null)),
  respostas jsonb not null,
  comentario_aberto text,
  criado_em timestamptz not null default now()
);
create unique index sam_apreciacoes_uma_por_pessoa
  on public.sam_apreciacoes (trabalho_id, user_id) where user_id is not null;

-- Programa do evento (aba "programa" do Apps Script da XI): a curadoria edita
-- trocas de horário aqui; quando trabalho_id está preenchido, o card do site
-- puxa autor/foto/resumo do trabalho publicado.
create table public.sam_programa (
  id uuid primary key default gen_random_uuid(),
  edicao_id text not null references public.sam_edicoes(id),
  dia date not null,
  bloco text not null check (bloco in ('oral', 'poster')),
  ordem text not null,                                      -- TC1.., P1..
  hora text,
  ambiente text,
  tema text,
  apresentador text,                                        -- nome público
  titulo text,
  trabalho_id uuid references public.sam_trabalhos(id) on delete set null,
  unique (edicao_id, dia, bloco, ordem)
);

-- Curadoria (NPCMed) substitui a senha compartilhada por conta Capi + papel.
-- Por e-mail institucional: a professora vira curadora assim que criar a
-- conta no Capi com esse e-mail (não precisa existir conta antes).
create table public.sam_curadores (
  email text primary key check (email = lower(email) and email like '%@%'),
  incluido_em timestamptz not null default now()
);

create table public.sam_curadoria_log (
  id uuid primary key default gen_random_uuid(),
  trabalho_id uuid not null references public.sam_trabalhos(id) on delete cascade,
  curador_id uuid not null references public.profiles(id),
  status text not null check (status in ('publicado', 'ajuste')),
  comentario text,
  criado_em timestamptz not null default now()
);

-- ---------- funções auxiliares ----------

create function public.sam_eh_curador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sam_curadores c join public.profiles p on lower(p.email) = c.email
                 where p.id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- O apresentador é reconhecido como na Sessão: o e-mail da conta Capi
-- (profiles, criado pelo autocadastro por matrícula) igual ao da matrícula.
create function public.sam_eh_autor(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sam_trabalhos w
                 join public.profiles p on p.id = auth.uid()
                 where w.id = t and lower(p.email) = lower(w.apresentador_email));
$$;

-- Executáveis também por anon: as políticas de leitura pública as avaliam, e
-- sem login auth.uid() é nulo, então ambas devolvem false.
revoke all on function public.sam_eh_curador() from public;
revoke all on function public.sam_eh_autor(uuid) from public;
grant execute on function public.sam_eh_curador() to anon, authenticated;
grant execute on function public.sam_eh_autor(uuid) to anon, authenticated;

-- O trabalho da própria pessoa na edição. Curadores leem todos os trabalhos
-- pelas políticas, então "o meu" precisa vir do vínculo por e-mail, que o
-- navegador não enxerga.
create function public.sam_meu_trabalho(e text) returns uuid
language sql stable security definer set search_path = '' as $$
  select w.id from public.sam_trabalhos w
  join public.profiles p on p.id = auth.uid()
  where w.edicao_id = e and lower(p.email) = lower(w.apresentador_email)
  limit 1;
$$;
revoke all on function public.sam_meu_trabalho(text) from public, anon;
grant execute on function public.sam_meu_trabalho(text) to authenticated;

-- Aluno salva o próprio trabalho (conteúdo, não status). Ao salvar, o trabalho
-- vai (ou volta) para a curadoria. Publicado não é editável pelo aluno.
create function public.sam_salvar_trabalho(t uuid, dados jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.sam_eh_autor(t) then raise exception 'Sem acesso a este trabalho'; end if;
  update public.sam_trabalhos set
    titulo = coalesce(dados->>'titulo', titulo),
    desenho = dados->>'desenho', area = dados->>'area', afiliacao = dados->>'afiliacao',
    prof_uc = dados->>'profUc',
    introducao = dados->>'introducao', objetivos = dados->>'objetivos',
    metodos = dados->>'metodos', resultados = dados->>'resultados',
    conclusao = dados->>'conclusao', resumo_completo = dados->>'resumo_completo',
    palavras = coalesce(array(select jsonb_array_elements_text(dados->'palavras')), '{}'),
    referencias = dados->>'referencias',
    fig_principal = nullif(dados->>'fig_principal', '')::integer,
    slides_url = dados->>'slidesUrl',
    status = 'enviado', enviado_em = now(), atualizado_em = now()
  where id = t and status <> 'publicado';
  if not found then raise exception 'Trabalho publicado não pode ser alterado pelo aluno'; end if;
  -- Autoria: lista "autores" substitui a anterior, na ordem dada. Aceita o
  -- formato da XI (lista de nomes) ou [{nome, papel}].
  if jsonb_typeof(dados->'autores') = 'array' then
    delete from public.sam_trabalho_autores where trabalho_id = t;
    insert into public.sam_trabalho_autores (trabalho_id, ordem, nome, papel)
    select t, a.ordinality,
           trim(case jsonb_typeof(a.value) when 'string' then a.value #>> '{}' else a.value->>'nome' end),
           coalesce(case jsonb_typeof(a.value) when 'object' then a.value->>'papel' end, 'autor')
    from jsonb_array_elements(dados->'autores') with ordinality as a(value, ordinality);
  end if;
end $$;

-- Cria, de forma idempotente, um trabalho por aluno da 7ª e da 8ª fase no
-- semestre da edição. Todos os da lista contam como matriculados, inclusive
-- Pré-Matrícula (decisão do professor, 09/10). XII SAM = 2026-2:
-- T13 (7ª, pôster TC1) e T12 (8ª, oral TC2), conforme a lista de 25/08.
-- O aluno é o "autor"; a lista "autores" fica para ele preencher.
create function public.sam_criar_trabalhos_da_edicao(e text) returns integer
language plpgsql security definer set search_path = '' as $$
declare criados integer;
begin
  if not public.sam_eh_curador() then raise exception 'Somente curadoria'; end if;
  with novos as (
    insert into public.sam_trabalhos (edicao_id, codigo, apresentador_email, apresentador_nome, fase, modalidade)
    select ed.id, 'F' || m.fase || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
           lower(m.email), m.nome, m.fase, case m.fase when 7 then 'poster_tc1' else 'oral_tc2' end
    from public.sam_edicoes ed join public.matriculas m on m.semestre = ed.semestre
    where ed.id = e and m.fase in (7, 8)
    on conflict (edicao_id, apresentador_email) do nothing
    returning id, apresentador_nome
  )
  select count(*) into criados from novos;
  return criados;
end $$;
revoke all on function public.sam_criar_trabalhos_da_edicao(text) from public, anon;
grant execute on function public.sam_criar_trabalhos_da_edicao(text) to authenticated;

-- Curadoria publica ou devolve; comentário obrigatório na devolução.
create function public.sam_decidir_curadoria(t uuid, decisao text, comentario text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.sam_eh_curador() then raise exception 'Somente curadoria'; end if;
  if decisao not in ('publicado', 'ajuste') then raise exception 'Decisão inválida'; end if;
  if decisao = 'ajuste' and length(trim(coalesce(comentario, ''))) = 0 then
    raise exception 'Comentário obrigatório para ajuste'; end if;
  update public.sam_trabalhos set status = decisao, comentario_curadoria = comentario,
    publicado_em = case when decisao = 'publicado' then now() else publicado_em end,
    atualizado_em = now()
  where id = t and status in ('enviado', 'ajuste', 'publicado');
  if not found then raise exception 'Trabalho não está em curadoria'; end if;
  insert into public.sam_curadoria_log (trabalho_id, curador_id, status, comentario)
  values (t, auth.uid(), decisao, comentario);
end $$;

-- Ajuste de layout do pôster feito pela curadoria (vista "TV" da XI).
create function public.sam_ajustar_layout(t uuid, ajuste jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.sam_eh_curador() then raise exception 'Somente curadoria'; end if;
  update public.sam_trabalhos set ajuste_layout = ajuste, atualizado_em = now() where id = t;
  if not found then raise exception 'Trabalho não encontrado'; end if;
end $$;
revoke all on function public.sam_ajustar_layout(uuid, jsonb) from public, anon;
grant execute on function public.sam_ajustar_layout(uuid, jsonb) to authenticated;

revoke all on function public.sam_salvar_trabalho(uuid, jsonb) from public, anon;
revoke all on function public.sam_decidir_curadoria(uuid, text, text) from public, anon;
grant execute on function public.sam_salvar_trabalho(uuid, jsonb) to authenticated;
grant execute on function public.sam_decidir_curadoria(uuid, text, text) to authenticated;

-- ---------- RLS ----------
-- Escritas de trabalho/status só pelas funções acima; materiais só pelo
-- pipeline (service_role) ou curadoria. Nada de escrita direta do navegador
-- em sam_trabalhos.

alter table public.sam_edicoes enable row level security;
alter table public.sam_trabalhos enable row level security;
alter table public.sam_trabalho_autores enable row level security;
alter table public.sam_figuras enable row level security;
alter table public.sam_materiais enable row level security;
alter table public.sam_apreciacoes enable row level security;
alter table public.sam_curadores enable row level security;
alter table public.sam_programa enable row level security;
alter table public.sam_curadoria_log enable row level security;

revoke all on public.sam_edicoes, public.sam_trabalhos, public.sam_trabalho_autores,
  public.sam_figuras, public.sam_materiais, public.sam_apreciacoes,
  public.sam_curadores, public.sam_curadoria_log, public.sam_programa from anon, authenticated;

grant select on public.sam_programa to anon, authenticated;
grant insert, update, delete on public.sam_programa to authenticated;
create policy sam_programa_leitura on public.sam_programa for select using (true);
create policy sam_programa_curadoria on public.sam_programa for all to authenticated
  using (public.sam_eh_curador()) with check (public.sam_eh_curador());

grant select on public.sam_edicoes to anon, authenticated;
create policy sam_edicoes_leitura on public.sam_edicoes for select using (true);

-- Site público: só publicados. Autor vê o seu; curadoria vê todos.
-- Todas as colunas exceto apresentador_email (e-mail nunca vai ao navegador).
grant select (id, edicao_id, codigo, apresentador_nome, fase, modalidade, status, titulo,
  desenho, area, orientador_id, prof_uc, afiliacao, introducao, objetivos, metodos, resultados,
  conclusao, resumo_completo, palavras, referencias, fig_principal, foto_autores_path,
  ajuste_layout, slides_url, comentario_curadoria, dia, horario, estacao, enviado_em,
  publicado_em, criado_em, atualizado_em) on public.sam_trabalhos to anon, authenticated;
create policy sam_trabalhos_publicos on public.sam_trabalhos for select
  using (status = 'publicado');
create policy sam_trabalhos_autor on public.sam_trabalhos for select to authenticated
  using (public.sam_eh_autor(id));
create policy sam_trabalhos_curadoria on public.sam_trabalhos for select to authenticated
  using (public.sam_eh_curador());

-- Decisão do professor (08/10): nomes dos autores são públicos junto ao
-- trabalho, com permissão; e-mail NUNCA é público. Curadoria obtém o contato
-- do apresentador pela função abaixo.
grant select on public.sam_trabalho_autores to anon, authenticated;
create policy sam_autores_publicos on public.sam_trabalho_autores for select
  using (exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status = 'publicado'));
create policy sam_autores_proprios on public.sam_trabalho_autores for select to authenticated
  using (public.sam_eh_autor(trabalho_id) or public.sam_eh_curador());

-- Contato do apresentador, só para a curadoria (ex.: avisar sobre ajuste).
create function public.sam_contato_apresentador(t uuid)
returns table (nome text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.sam_eh_curador() then raise exception 'Somente curadoria'; end if;
  return query select w.apresentador_nome, w.apresentador_email from public.sam_trabalhos w where w.id = t;
end $$;
revoke all on function public.sam_contato_apresentador(uuid) from public, anon;
grant execute on function public.sam_contato_apresentador(uuid) to authenticated;

grant select on public.sam_figuras to anon, authenticated;
grant insert, update, delete on public.sam_figuras to authenticated;
create policy sam_figuras_leitura on public.sam_figuras for select
  using (exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status = 'publicado')
         or public.sam_eh_autor(trabalho_id) or public.sam_eh_curador());
create policy sam_figuras_autor on public.sam_figuras for all to authenticated
  using (public.sam_eh_autor(trabalho_id)
         and exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status <> 'publicado'))
  with check (public.sam_eh_autor(trabalho_id)
         and exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status <> 'publicado'));

grant select on public.sam_materiais to anon, authenticated;
create policy sam_materiais_publicos on public.sam_materiais for select
  using (exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status = 'publicado'));

-- Visitante (anon) só registra como visitante; docente/aluno com a própria conta.
-- Leitura das apreciações: somente curadoria.
grant insert on public.sam_apreciacoes to anon, authenticated;
grant select on public.sam_apreciacoes to authenticated;
create policy sam_apreciacao_visitante on public.sam_apreciacoes for insert to anon
  with check (tipo_apreciador = 'visitante' and user_id is null
    and exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status = 'publicado'));
create policy sam_apreciacao_identificada on public.sam_apreciacoes for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.sam_trabalhos t where t.id = trabalho_id and t.status = 'publicado')
    and (tipo_apreciador = 'aluno'
         or (tipo_apreciador = 'docente' and exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('professor', 'admin')))));
create policy sam_apreciacao_curadoria on public.sam_apreciacoes for select to authenticated
  using (public.sam_eh_curador());

grant select on public.sam_curadoria_log to authenticated;
create policy sam_log_curadoria on public.sam_curadoria_log for select to authenticated
  using (public.sam_eh_curador());

-- sam_curadores: sem acesso do navegador; mantido por admin via service_role.

-- PENDENTE (depende de respostas/decisões):
-- 1. Resolvido (08/10): um trabalho por aluno apresentador; demais autores
--    (orientador, coorientador, outros) só por nome em sam_trabalho_autores.
-- 2. Buckets do Storage (sam-figuras: leitura pública só de publicados; escrita
--    do autor no próprio prefixo) — políticas a escrever com o fluxo de upload.
-- 3. Pipeline de IA (podcast, flashcards, quiz) grava em sam_materiais via
--    service_role; formato e revisão a definir.
