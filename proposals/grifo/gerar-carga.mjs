// Gera o SQL de carga dos grifos APROVADOS para public.capi_question_clues.
//   node proposals/grifo/gerar-carga.mjs <grifos.json> <AMRIGS|ENAMED> > carga.sql
// Idempotente (upsert por question_key). No AMRIGS, a carga só grava se o
// enunciado no banco tiver o mesmo SHA-256 e contiver cada trecho no mesmo lugar.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [arquivo, contexto] = process.argv.slice(2);
if (!arquivo || !['AMRIGS', 'ENAMED'].includes(contexto)) throw new Error('uso: gerar-carga.mjs <grifos.json> <AMRIGS|ENAMED>');
const dados = JSON.parse(await readFile(arquivo, 'utf8'));
const lit = s => "'" + String(s).replace(/'/g, "''") + "'";
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');

const linhas = [];
for (const r of dados.resultados.filter(x => x.status === 'aprovada')) {
  const clues = r.pistas.map(p => ({ inicio: p.inicio, fim: p.fim, trecho: p.trecho, porque: p.porque }));
  for (const c of clues) if (r.stem.slice(c.inicio, c.fim) !== c.trecho) throw new Error('trecho fora do lugar: ' + r.id);
  const qid = contexto === 'AMRIGS' ? `${lit(r.id)}::uuid` : 'null';
  linhas.push(`(${lit(r.id)}, ${qid}, ${lit(contexto)}, ${lit(sha(r.stem))}, ${lit(JSON.stringify(clues))}::jsonb, ${lit(dados.modelo)}, ${lit(dados.verificador)})`);
}
const guarda = contexto === 'AMRIGS' ? `
-- Só entra grifo cujo enunciado no banco é idêntico ao que foi grifado.
delete from _carga c where not exists (select 1 from public.capi_training_questions q
  where q.id = c.question_id and encode(extensions.digest(q.body->>'stem', 'sha256'), 'hex') = c.stem_sha256);` : '';
console.log(`-- Carga de grifos ${contexto}: ${linhas.length} questões aprovadas (gerado por gerar-carga.mjs).
begin;
create temp table _carga (question_key text, question_id uuid, context text, stem_sha256 text, clues jsonb, model text, verifier text) on commit drop;
insert into _carga values
${linhas.join(',\n')};
${guarda}
insert into public.capi_question_clues (question_key, question_id, context, stem_sha256, clues, model, verifier)
select * from _carga
on conflict (question_key) do update set question_id = excluded.question_id, stem_sha256 = excluded.stem_sha256,
  clues = excluded.clues, model = excluded.model, verifier = excluded.verifier, status = 'ativo', generated_at = now();
select context, count(*) as grifos from public.capi_question_clues group by context;
commit;`);
