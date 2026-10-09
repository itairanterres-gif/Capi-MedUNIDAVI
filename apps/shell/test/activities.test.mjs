import test from 'node:test';
import assert from 'node:assert/strict';
import { activitiesFor } from '../activities.mjs';
import { renderLogin } from '../pages.mjs';

const hrefs = (role, opt) => activitiesFor(role, opt).map(a => a.href);

test('after login each role sees its own Capi activities', () => {
  assert.deepEqual(hrefs('aluno', { amrigs: true }), ['/amrigs/', '/questoes/#/aluno', '/questoes/#/cards']);
  assert.deepEqual(hrefs('aluno', { amrigs: false }), ['/questoes/#/aluno', '/questoes/#/cards']);
  assert.deepEqual(hrefs('egresso', { amrigs: true }), ['/amrigs/']);
  assert.deepEqual(hrefs('professor', { amrigs: true }), ['/questoes/#/professor', '/questoes/#/importacao']);
  assert.deepEqual(hrefs('admin', { amrigs: true }), ['/questoes/#/professor', '/questoes/#/importacao', '/questoes/#/coordenacao']);
  assert.deepEqual(hrefs('desconhecido', { amrigs: true }), []);
  for (const role of ['aluno', 'professor', 'admin', 'egresso'])
    assert.ok(!hrefs(role, { amrigs: true }).some(h => /enquete|enamed/i.test(h)), role);
});

test('login page has a hidden activities area filled only by the client after login', () => {
  const html = renderLogin();
  assert.match(html, /<nav id="activities" class="activities" aria-label="Suas atividades" hidden><\/nav>/);
});

test('SAM appears only when enabled: students go to their work, docents to curadoria', () => {
  assert.ok(!hrefs('aluno', { amrigs: true }).some(h => h.startsWith('/sam/')));
  assert.ok(hrefs('aluno', { amrigs: true, sam: true }).includes('/sam/submissao.html'));
  assert.ok(hrefs('professor', { sam: true }).includes('/sam/curadoria.html'));
  assert.ok(hrefs('admin', { sam: true }).includes('/sam/curadoria.html'));
  assert.ok(!hrefs('egresso', { sam: true }).some(h => h.startsWith('/sam/')));
});
