import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogFilter, questionYear } from '../amrigs-core.mjs';
import { renderAmrigsPilot } from '../pages.mjs';

const q = (id, source, area, stem, topic = '') => ({ id, body: { source, area, stem, topic, alternatives: [], correct: 'A' } });
const banco = [
  q('1', 'AMRIGS · 2019 · Prova · Questão 85', 'Clínica Médica', 'Paciente com diabetes e cetoacidose.', 'Endocrinologia'),
  q('2', 'AMRIGS · 2024 · Prova · Questão 60', 'Pediatria', 'Lactente com bronquiolite.'),
  q('3', 'AMRIGS · 2024 · Prova · Questão 9', 'Clínica Médica', 'Insuficiência cardíaca descompensada.'),
];

test('docent catalog filters by area, year and accent-insensitive text, newest first', () => {
  assert.equal(questionYear(banco[0]), 2019);
  assert.deepEqual(catalogFilter(banco).map(x => x.id), ['3', '2', '1']);
  assert.deepEqual(catalogFilter(banco, { area: 'Clínica Médica' }).map(x => x.id), ['3', '1']);
  assert.deepEqual(catalogFilter(banco, { year: '2024' }).map(x => x.id), ['3', '2']);
  assert.deepEqual(catalogFilter(banco, { q: 'CETOACIDOSE' }).map(x => x.id), ['1']);
  assert.deepEqual(catalogFilter(banco, { q: 'insuficiencia' }).map(x => x.id), ['3']);
  assert.deepEqual(catalogFilter(banco, { q: 'endocrino' }).map(x => x.id), ['1']);
  assert.deepEqual(catalogFilter(banco, { area: 'Pediatria', year: '2019' }), []);
});

test('AMRIGS page has a hidden docent catalog that never offers answering', () => {
  const html = renderAmrigsPilot(true);
  const catalogo = html.slice(html.indexOf('<section id="amrigs-catalog"'), html.indexOf('</section>', html.indexOf('<section id="amrigs-catalog"')));
  assert.match(catalogo, /hidden/);
  assert.match(catalogo, /não registra respostas/);
  assert.ok(!/type="radio"|Confirmar resposta/.test(catalogo));
});
