-- Programa da XII: professora da UC presente na banca em cada apresentação
-- (aparece na programação pública) e correção do salvamento do aluno: o
-- formulário não envia profUc, e a função apagava prof_uc a cada salvamento.
begin;

alter table public.sam_programa add column if not exists prof_uc text;

create or replace function public.sam_salvar_trabalho(t uuid, dados jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.sam_eh_autor(t) then raise exception 'Sem acesso a este trabalho'; end if;
  update public.sam_trabalhos set
    titulo = coalesce(dados->>'titulo', titulo),
    desenho = dados->>'desenho', area = dados->>'area', afiliacao = dados->>'afiliacao',
    prof_uc = coalesce(dados->>'profUc', prof_uc),
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
revoke all on function public.sam_salvar_trabalho(uuid, jsonb) from public, anon;
grant execute on function public.sam_salvar_trabalho(uuid, jsonb) to authenticated;

commit;
