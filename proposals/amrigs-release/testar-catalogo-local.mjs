// Testa 03-catalogo-docente.sql na stack LOCAL (transação desfeita).
// A stack local não tem Storage: a parte de figuras é omitida aqui e
// conferida no projeto real após a aplicação autorizada.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(dir, '../..');
const CONTAINER = 'supabase-sessao-database-b8d1e43506e1';
const semTransacao = t => t.split('\n').filter(l => !/^(begin|commit);$/.test(l.trim())).join('\n');
const ler = f => readFileSync(path.join(dir, f), 'utf8');
const catalogo = semTransacao(ler('03-catalogo-docente.sql'));
const semStorage = catalogo.slice(0, catalogo.indexOf('-- Storage:')) + catalogo.slice(catalogo.indexOf('-- Pós-condição'));
const liberar = semTransacao(ler('01-liberar-amrigs-institucional.sql'));
const privada = readFileSync(path.join(raiz, 'proposals/private-images.sql'), 'utf8');
const manifesto = privada.slice(privada.indexOf('CREATE TABLE public.capi_amrigs_image_manifest'), privada.indexOf('-- Invoker lookup'));

const sql = `begin;
-- estado igual ao real: sem as 2 demos, com manifesto, liberação aplicada
delete from public.capi_training_attempts where question_id in (select id from public.capi_training_questions where context = 'AMRIGS' and student_visible);
delete from public.capi_training_questions where context = 'AMRIGS' and student_visible and provenance ? 'fixture';
${manifesto}
${liberar}
${semStorage}
create temp table _r (k text, v text); grant all on _r to anon, authenticated;
create function pg_temp.como(email text) returns void language plpgsql as $f$
begin
  if email is null then perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role anon';
  else perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.profiles where profiles.email = $1), 'role', 'authenticated')::text, true);
       execute 'set local role authenticated'; end if;
end $f$;
-- docente (curadora fictícia, role professor)
select pg_temp.como('curadora.sam@example.invalid');
insert into _r select 'docente_le', count(*)::text from public.capi_training_questions where context = 'AMRIGS';
insert into _r select 'docente_manifesto', count(*)::text from public.capi_amrigs_image_manifest;
do $$ begin
  insert into public.capi_training_attempts (user_id, question_id, answer)
    select (select auth.uid()), id, 'A' from public.capi_training_questions where context = 'AMRIGS' limit 1;
  insert into _r values ('docente_grava', 'SIM (falha)');
exception when others then insert into _r values ('docente_grava', 'bloqueado: ' || sqlstate);
end $$;
reset role;
-- aluna (aluno com matrícula)
select pg_temp.como('aluna7.sam@example.invalid');
insert into _r select 'aluna_le', count(*)::text from public.capi_training_questions where context = 'AMRIGS';
reset role;
-- visitante
select pg_temp.como(null);
do $$ begin
  insert into _r select 'visitante_le', count(*)::text from public.capi_training_questions where context = 'AMRIGS';
exception when others then insert into _r values ('visitante_le', 'bloqueado: ' || sqlstate);
end $$;
reset role;
select k || '=' || v from _r order by k;
rollback;`;
try {
  const saida = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-At', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(saida.trim());
} catch (e) { console.log('ERRO:', String(e.stderr || e.message).split('\n').filter(l => /ERROR|LINE/.test(l)).join(' | ')); }
const depois = execFileSync('docker', ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-c',
  "select count(*) || ' questões, ' || count(*) filter (where student_visible) || ' visíveis; staff fn: ' || coalesce(to_regprocedure('public.capi_amrigs_staff()')::text, 'ausente') from public.capi_training_questions where context = 'AMRIGS'"], { encoding: 'utf8' });
console.log('banco local depois:', depois.trim());
