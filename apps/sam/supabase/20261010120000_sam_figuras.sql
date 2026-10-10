-- SAM · figuras e foto dos autores (parte do banco; sem Storage).
-- O aluno envia as imagens ao Storage (bucket sam-figuras, ver 02-storage) e
-- registra os caminhos aqui. Escrita só por esta função: valida dono, status,
-- quantidade e que cada caminho está na pasta do próprio trabalho.
-- Desfazer: desfazer-sam-figuras.sql.
begin;

-- Escrita direta de figuras pelo navegador sai; só a função abaixo escreve.
drop policy if exists sam_figuras_autor on public.sam_figuras;
revoke insert, update, delete on public.sam_figuras from authenticated;

create function public.sam_salvar_figuras(t uuid, figuras jsonb, foto text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare f jsonb; i integer := 0; padrao text := '^' || t::text || '/[A-Za-z0-9_.-]{1,80}$';
begin
  if not (public.sam_eh_autor(t) or public.sam_eh_curador()) then raise exception 'Sem acesso a este trabalho'; end if;
  if not public.sam_eh_curador() and exists (select 1 from public.sam_trabalhos w where w.id = t and w.status = 'publicado') then
    raise exception 'Trabalho publicado não pode ser alterado pelo aluno'; end if;
  if jsonb_typeof(figuras) is distinct from 'array' or jsonb_array_length(figuras) > 4 then
    raise exception 'Envie até 4 figuras'; end if;
  if coalesce(foto, '') <> '' and foto !~ padrao then raise exception 'Caminho de foto inválido'; end if;
  delete from public.sam_figuras where trabalho_id = t;
  for f in select value from jsonb_array_elements(figuras) loop
    i := i + 1;
    if coalesce(f->>'path', '') !~ padrao then raise exception 'Caminho de figura inválido'; end if;
    insert into public.sam_figuras (trabalho_id, ordem, secao, titulo, legenda, storage_path)
    values (t, i,
      case when f->>'secao' in ('Introdução', 'Métodos', 'Resultados', 'Discussão', 'Outra') then f->>'secao' else 'Resultados' end,
      left(coalesce(f->>'titulo', ''), 200), left(coalesce(f->>'legenda', ''), 600), f->>'path');
  end loop;
  update public.sam_trabalhos set foto_autores_path = nullif(foto, ''), atualizado_em = now() where id = t;
end $$;
revoke all on function public.sam_salvar_figuras(uuid, jsonb, text) from public, anon;
grant execute on function public.sam_salvar_figuras(uuid, jsonb, text) to authenticated;

commit;
