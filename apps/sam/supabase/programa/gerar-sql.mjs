// Gera o SQL que carrega o programa da XII SAM (saída de ler-cronograma.mjs).
//   node gerar-sql.mjs programa-xii.json > carga-programa-xii.sql
// Idempotente: apaga e recria sam_programa da edição; título, área, professora
// da UC e orientador só preenchem o que o aluno ainda não preencheu.
// O SQL contém nomes e matrículas: fica fora do Git (output/).
import { readFile } from 'node:fs/promises';

const dias = JSON.parse(await readFile(process.argv[2], 'utf8'));
const q = s => s == null || s === '' ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const trab = cod => `(select w.id from public.sam_trabalhos w join public.matriculas m on lower(m.email) = lower(w.apresentador_email) where w.edicao_id = 'xii' and m.matricula = ${q(cod)})`;

const prog = [], preenche = [], orient = [];
for (const [dia, v] of Object.entries(dias)) {
  for (const o of v.orais) {
    prog.push(`(${q(dia)}, 'oral', ${q(o.tc)}, ${q(o.hora)}, ${q(o.area)}, ${q(null)}, ${q(o.titulo)}, ${trab(o.matricula)}, ${q(o.profUc)})`);
    preenche.push(`update public.sam_trabalhos w set titulo = coalesce(nullif(w.titulo, ''), ${q(o.titulo)}), area = coalesce(nullif(w.area, ''), ${q(o.area)}), prof_uc = coalesce(nullif(w.prof_uc, ''), ${q(o.profUc)}) where w.id = ${trab(o.matricula)};`);
    orient.push([o.matricula, o.orientador]);
  }
  for (const p of v.posteres) {
    if (!p.matricula) continue;
    prog.push(`(${q(dia)}, 'poster', ${q('P' + p.n)}, ${q(null)}, ${q(null)}, ${q(p.nome)}, ${q(null)}, ${trab(p.matricula)}, ${q(p.profUc)})`);
    preenche.push(`update public.sam_trabalhos w set prof_uc = coalesce(nullif(w.prof_uc, ''), ${q(p.profUc)}) where w.id = ${trab(p.matricula)};`);
  }
}
// sam_programa: (dia, bloco, ordem, hora, tema, apresentador, titulo, trabalho_id, prof_uc)
// Nas orais o apresentador vem do próprio trabalho (nome da matrícula).
const nomeDe = cod => `(select m.nome from public.matriculas m where m.matricula = ${q(cod)})`;
console.log(`-- Programa da XII SAM (cronograma de 30/09/2026). Gerado por gerar-sql.mjs; contém nomes: não versionar.
begin;
delete from public.sam_programa where edicao_id = 'xii';
insert into public.sam_programa (edicao_id, dia, bloco, ordem, hora, tema, apresentador, titulo, trabalho_id, prof_uc)
select 'xii', x.dia::date, x.bloco, x.ordem, x.hora, x.tema, coalesce(x.apresentador, w.apresentador_nome), x.titulo, x.trabalho_id, x.prof_uc
from (values
${prog.join(',\n')}
) as x(dia, bloco, ordem, hora, tema, apresentador, titulo, trabalho_id, prof_uc)
left join public.sam_trabalhos w on w.id = x.trabalho_id;
${preenche.join('\n')}
-- Orientador entra na lista de autores só dos trabalhos que ainda não têm nenhuma.
${orient.map(([cod, nome]) => `insert into public.sam_trabalho_autores (trabalho_id, ordem, nome, papel)
select ${trab(cod)}, 90, ${q(nome)}, 'orientador' where ${trab(cod)} is not null
  and not exists (select 1 from public.sam_trabalho_autores a where a.trabalho_id = ${trab(cod)});`).join('\n')}
select (select count(*) from public.sam_programa where edicao_id = 'xii' and bloco = 'oral') as orais,
       (select count(*) from public.sam_programa where edicao_id = 'xii' and bloco = 'poster') as posteres,
       (select count(*) from public.sam_programa where edicao_id = 'xii' and trabalho_id is null) as sem_trabalho,
       (select count(*) from public.sam_trabalho_autores a join public.sam_trabalhos w on w.id = a.trabalho_id where w.edicao_id = 'xii' and a.papel = 'orientador') as orientadores;
commit;`);
