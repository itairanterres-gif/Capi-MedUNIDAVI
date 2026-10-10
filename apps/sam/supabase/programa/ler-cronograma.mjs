// Lê o cronograma da XII SAM (PDF → texto "raw" do pdftotext) e gera o programa
// estruturado, ligando cada apresentação ao trabalho do aluno.
//   pdftotext -enc UTF-8 -raw Cronograma.pdf cronograma-raw.txt
//   node ler-cronograma.mjs cronograma-raw.txt alunos.json saida.json
// alunos.json: [{matricula, nome, fase}] (exportado do banco, nunca versionado).
// Orais: âncora = matrícula do apresentador. Pôsteres: nome (sem acento/caixa).
// Imprime só totais e pendências, nunca nomes de alunos.
import { readFile, writeFile } from 'node:fs/promises';

const [txt, alunosArq, saida] = process.argv.slice(2);
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const AREAS = ['Medicina do estilo de vida', 'Ginecologia e obstetrícia', 'Otorrinolaringologia', 'Gastroenterologia', 'Cirurgia torácica', 'Cirurgia geral',
  'Neurocirurgia', 'Endocrinologia', 'Anestesiologia', 'Reumatologia', 'Dermatologia', 'Infectologia', 'Cardiologia', 'Psiquiatria', 'Neurologia', 'Ortopedia', 'Pediatria', 'Oncologia'];
const PROF_UC = ['Franciani Rodrigues da Rocha', 'Samantha Cristiane Lopes', 'Alinne Petris'];
const DIAS = { 23: '2026-11-23', 24: '2026-11-24', 25: '2026-11-25', 26: '2026-11-26', 27: '2026-11-27' };

const alunos = JSON.parse(await readFile(alunosArq, 'utf8'));
const porMatricula = new Map(alunos.map(a => [String(a.matricula), a]));
const porNome = new Map(); for (const a of alunos.filter(x => x.fase === 7)) { const k = norm(a.nome); porNome.set(k, [...(porNome.get(k) || []), a]); }

const linhas = (await readFile(txt, 'utf8')).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const dias = {}; let dia = null; const pend = [];
const tiraProf = s => { for (const p of PROF_UC) if (norm(s).endsWith(norm(p))) return [s.slice(0, s.length - p.length).trim(), p]; return [s, '']; };

const brutos = [];
for (const l of linhas) {
  let m;
  if ((m = l.match(/^(\d{1,2}) de novembro/))) { dia = DIAS[Number(m[1])]; dias[dia] = { orais: [], posteres: [], sci: '', abertura: '' }; continue; }
  if (!dia || l.startsWith('Horário Atividade')) continue;
  if ((m = l.match(/^(\d{2}h\d{2}) - (\d{2}h\d{2})$/)) && !dias[dia].sci) { dias[dia].sci = `${m[1]}–${m[2]}`; continue; }
  if ((m = l.match(/^(\d{2}h\d{2}) - (\d{2}h\d{2}) Abertura/))) { dias[dia].abertura = `${m[1]}–${m[2]}`; continue; }
  if ((m = l.match(/^(\d{2}h\d{2}) - (\d{2}h\d{2}) (TC\d) (.+)$/))) { brutos.push({ dia, hora: `${m[1]}`, fim: m[2], tc: m[3], resto: m[4] }); continue; }
  if ((m = l.match(/^Pôster (\d+) (.+)$/))) {
    const [nome, prof] = tiraProf(m[2]);
    dias[dia].posteres.push({ n: Number(m[1]), nome, profUc: prof });
  }
}

// 1ª passada das orais: separa área, apresentador (pela matrícula) e a cauda.
const nomePorCodigo = new Map();   // código de professor → nome (aprendido nos avaliadores)
for (const b of brutos) {
  const tokens = b.resto.split(' ');
  const iCod = tokens.findIndex(t => porMatricula.has(t));
  if (iCod < 0) { pend.push(`oral ${b.dia} ${b.tc}: matrícula do apresentador não encontrada no banco`); b.ruim = true; continue; }
  b.matricula = tokens[iCod];
  const antes = tokens.slice(0, iCod).join(' ');
  const area = AREAS.find(a => norm(antes).startsWith(norm(a)));
  if (!area) { pend.push(`oral ${b.dia} ${b.tc}: área não reconhecida`); b.ruim = true; continue; }
  b.area = area;
  const [cauda, prof] = tiraProf(tokens.slice(iCod + 1).join(' '));
  b.profUc = prof;
  const digs = [...cauda.matchAll(/\b\d{3,8}\b/g)];
  if (!digs.length) { pend.push(`oral ${b.dia} ${b.tc}: não achei código de orientador/avaliador`); b.ruim = true; continue; }
  const d1 = digs.length >= 2 ? digs[digs.length - 2] : digs[0], d2 = digs.length >= 2 ? digs[digs.length - 1] : null;
  b.avaliador = cauda.slice(d1.index + d1[0].length, d2 ? d2.index : undefined).trim();
  b.codOrient = d1[0]; b.codAval = d2 ? d2[0] : '';
  b.antesOrient = cauda.slice(0, d1.index).trim();     // título + orientador
  if (b.codAval) { nomePorCodigo.set(b.codAval, b.avaliador); }
}
// 2ª passada: orientador = maior sufixo (2–7 palavras) que seja um nome já visto.
const sufixos = (s) => { const w = s.split(' '); const r = []; for (let k = Math.min(7, w.length - 1); k >= 2; k--) r.push(w.slice(w.length - k).join(' ')); return r; };
const conhecidos = new Set([...nomePorCodigo.values(), ...PROF_UC].map(norm));
// Correções conferidas nas linhas originais do PDF (nome completo do orientador,
// quando o primeiro nome ficou colado no título ou os anos do título confundiram o código).
const CORRIGE = {
  '2026-11-23|TC1': { orientador: 'José Eduardo Lobato D’Agostini' },
  '2026-11-23|TC3': { orientador: "José Eduardo Lobato D'Agostini" },
  '2026-11-23|TC4': { orientador: 'Mariana Marhofer Celli' },
  '2026-11-23|TC5': { orientador: 'Juliana Mazini Alves' },
  '2026-11-24|TC2': { orientador: 'Aline Dellagiustina Rohden' },
  '2026-11-25|TC6': { orientador: 'Mariáh Bianchin Gonçalves' },
  '2026-11-26|TC7': { orientador: 'Luis Claudio Hobus' },
  '2026-11-27|TC7': { orientador: 'Anderson De Freitas' },
  '2026-11-24|TC4': { orientador: 'Paula Regina da Costa' },
  '2026-11-25|TC4': { orientador: 'Ricardo Stefano da Penha' },
  '2026-11-25|TC5': { orientador: 'Ricardo Stefano da Penha' },
  '2026-11-25|TC7': { orientador: 'Luiza Boechat Tiago', avaliador: 'Lúcio Dalri' },
  '2026-11-27|TC3': { orientador: 'Wilsterman de Freitas Correia' },
  '2026-11-27|TC5': { orientador: 'Marlou Cristine Ferreira Dalri' },
  '2026-11-27|TC6': { orientador: 'Marlou Cristine Ferreira Dalri' },
};
for (const b of brutos.filter(x => !x.ruim)) {
  const fix = CORRIGE[`${b.dia}|${b.tc}`];
  if (fix) {
    // Título = do fim do código do apresentador até o orientador (na linha original).
    const r = b.resto, ini = r.indexOf(b.matricula) + b.matricula.length, fim = r.lastIndexOf(fix.orientador);
    if (fim < 0) { pend.push(`oral ${b.dia} ${b.tc}: correção de orientador não casou com a linha`); }
    else { b.orientador = fix.orientador; b.titulo = r.slice(ini, fim).trim(); if (fix.avaliador) b.avaliador = fix.avaliador;
      dias[b.dia].orais.push({ tc: b.tc, hora: b.hora, horaFim: b.fim, area: b.area, matricula: b.matricula, titulo: b.titulo, orientador: b.orientador, avaliador: b.avaliador, profUc: b.profUc }); continue; }
  }
  const doCodigo = nomePorCodigo.get(b.codOrient);
  let achou = doCodigo && norm(b.antesOrient).endsWith(norm(doCodigo)) ? b.antesOrient.slice(b.antesOrient.length - doCodigo.length) : '';
  if (!achou) achou = sufixos(b.antesOrient).find(s => conhecidos.has(norm(s))) || '';
  if (!achou) { const w = b.antesOrient.split(' '); achou = w.slice(-3).join(' '); pend.push(`oral ${b.dia} ${b.tc}: orientador deduzido (confira): "${achou}" | final do título: "…${b.antesOrient.slice(0, b.antesOrient.length - achou.length).slice(-40)}"`); }
  b.orientador = achou;
  b.titulo = b.antesOrient.slice(0, b.antesOrient.length - achou.length).trim();
  dias[b.dia].orais.push({ tc: b.tc, hora: b.hora.replace('h', 'h'), horaFim: b.fim, area: b.area, matricula: b.matricula, titulo: b.titulo, orientador: b.orientador, avaliador: b.avaliador, profUc: b.profUc });
}
// Pôsteres: nome → matrícula.
const usados = new Set();
for (const [d, v] of Object.entries(dias)) for (const p of v.posteres) {
  const c = porNome.get(norm(p.nome)) || [];
  if (c.length === 1) { p.matricula = String(c[0].matricula); usados.add(p.matricula); }
  else pend.push(`pôster ${d} nº ${p.n}: ${c.length ? 'nome ambíguo' : 'nome não encontrado na lista da 7ª fase'}`);
}
const orais = Object.values(dias).flatMap(d => d.orais);
const emOral = new Set(orais.map(o => o.matricula));
const faltam8 = alunos.filter(a => a.fase === 8 && !emOral.has(String(a.matricula))).map(a => a.matricula);
const faltam7 = alunos.filter(a => a.fase === 7 && !usados.has(String(a.matricula))).map(a => a.matricula);
const dup = orais.map(o => o.matricula).filter((m, i, a) => a.indexOf(m) !== i);

await writeFile(saida, JSON.stringify(dias, null, 1));
console.log('Dias:', Object.keys(dias).length, '| orais:', orais.length, '| pôsteres:', Object.values(dias).reduce((s, d) => s + d.posteres.length, 0));
for (const [d, v] of Object.entries(dias)) console.log(' ', d, 'sci', v.sci, v.abertura ? 'abertura ' + v.abertura : '', '| orais', v.orais.length, '| pôsteres', v.posteres.length);
console.log('8ª fase no banco sem apresentação no cronograma (matrículas):', faltam8.join(', ') || 'nenhuma');
console.log('7ª fase no banco sem pôster no cronograma (matrículas):', faltam7.join(', ') || 'nenhuma');
console.log('matrículas repetidas nas orais:', dup.join(', ') || 'nenhuma');
console.log('Pendências:', pend.length); pend.forEach(p => console.log(' -', p));
