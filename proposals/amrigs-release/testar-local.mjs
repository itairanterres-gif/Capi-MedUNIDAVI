// Testa 01-liberar e 02-desfazer na stack LOCAL da Sessão, sempre dentro de
// transações desfeitas (ROLLBACK): nada fica gravado.
//   node proposals/amrigs-release/testar-local.mjs
// Teste 1: estado local diferente do real → a liberação precisa recusar.
// Teste 2: reproduz o estado real (sem as 2 questões fictícias de demonstração,
//          com o manifesto das 31 figuras) → libera, confere, desfaz, confere.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(dir, '../..');
const CONTAINER = 'supabase-sessao-database-b8d1e43506e1';
const semTransacao = f => readFileSync(path.join(dir, f), 'utf8').split('\n').filter(l => !/^(begin|commit);$/.test(l.trim())).join('\n');
function psql(sql) {
  try {
    return { ok: true, saida: execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }) };
  } catch (e) { return { ok: false, saida: String(e.stdout || ''), erro: String(e.stderr || '').split('\n').find(l => l.includes('ERROR')) || String(e.message) }; }
}
const liberar = semTransacao('01-liberar-amrigs-institucional.sql');
const desfazer = semTransacao('02-desfazer-liberacao-amrigs.sql');
const privada = readFileSync(path.join(raiz, 'proposals/private-images.sql'), 'utf8');
const manifesto = privada.slice(privada.indexOf('CREATE TABLE public.capi_amrigs_image_manifest'), privada.indexOf('-- Invoker lookup'));

// Com o manifesto presente mas as 2 questões fictícias visíveis (479 no total),
// a liberação precisa parar na pré-condição de contagem.
const t1 = psql(`begin;\n${manifesto}\n${liberar}\nrollback;`);
console.log('teste 1 (deve recusar por contagem):', t1.ok ? 'FALHOU — aplicou sem recusar'
  : /Estado inesperado/.test(t1.erro) ? 'OK — ' + t1.erro : 'FALHOU — recusou por outro motivo: ' + t1.erro);

const t2 = psql(`begin;
delete from public.capi_training_attempts where question_id in (select id from public.capi_training_questions where context = 'AMRIGS' and student_visible);
delete from public.capi_training_questions where context = 'AMRIGS' and student_visible and provenance ? 'fixture';
${manifesto}
${liberar}
select 'APOS_LIBERAR', count(*) filter (where student_visible), (select count(*) from public.capi_amrigs_image_manifest where delivery_enabled) from public.capi_training_questions where context = 'AMRIGS';
${desfazer}
select 'APOS_DESFAZER', count(*) filter (where student_visible), count(*) filter (where editorial_status = 'draft'), (select count(*) from public.capi_amrigs_image_manifest where delivery_enabled) from public.capi_training_questions where context = 'AMRIGS';
rollback;`);
console.log('teste 2:', t2.ok ? 'OK' : 'ERRO — ' + t2.erro);
console.log(t2.saida.split('\n').filter(l => l.startsWith('APOS')).join('\n'));
const depois = psql(`select count(*) || ' questões, ' || count(*) filter (where student_visible) || ' visíveis' from public.capi_training_questions where context = 'AMRIGS'; select coalesce(to_regclass('public.capi_amrigs_image_manifest')::text, 'sem manifesto (como antes)');`);
console.log('banco local depois:', depois.saida.trim().replace('\n', ' | '));
