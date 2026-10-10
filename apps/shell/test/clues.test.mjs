import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { stemSegments, stemHash, usableClues } from '../clues.mjs';

const stem = 'Homem, 22 anos, dor em fossa ilíaca direita e sinal de Blumberg. Qual a conduta?';
const clue = (trecho, porque = 'p') => ({ inicio: stem.indexOf(trecho), fim: stem.indexOf(trecho) + trecho.length, trecho, porque });

test('clues split the stem in order, numbered, and rebuild the original text', () => {
  const partes = stemSegments(stem, [clue('sinal de Blumberg', 'irritação peritoneal'), clue('dor em fossa ilíaca direita')]);
  assert.equal(partes.map(p => p.text).join(''), stem);
  assert.deepEqual(partes.filter(p => p.n).map(p => [p.n, p.text]), [[1, 'dor em fossa ilíaca direita'], [2, 'sinal de Blumberg']]);
  assert.equal(partes.find(p => p.n === 2).porque, 'irritação peritoneal');
});

test('a clue that does not match the stem letter by letter drops all highlighting', () => {
  for (const ruim of [{ ...clue('sinal de Blumberg'), trecho: 'sinal de blumberg' }, { ...clue('Homem'), fim: 999 },
    { inicio: 'x', fim: 3, trecho: 'Hom' }, null])
    assert.deepEqual(stemSegments(stem, [clue('dor em fossa ilíaca direita'), ruim]), [{ text: stem }]);
  const a = clue('fossa ilíaca'), b = clue('ilíaca direita');
  assert.deepEqual(stemSegments(stem, [a, b]), [{ text: stem }], 'overlap');
});

test('clues are shown only for the same stem they were computed on', async () => {
  const sha = createHash('sha256').update(stem, 'utf8').digest('hex');
  assert.equal(await stemHash(stem, webcrypto.subtle), sha);
  const q = { body: { stem } };
  assert.ok(await usableClues(q, { stem_sha256: sha, clues: [clue('sinal de Blumberg')] }, webcrypto.subtle));
  assert.equal(await usableClues({ body: { stem: stem + ' ' } }, { stem_sha256: sha, clues: [clue('sinal de Blumberg')] }, webcrypto.subtle), null);
  assert.equal(await usableClues(q, null, webcrypto.subtle), null);
});

import { stemDisplay } from '../clues.mjs';
test('association columns, items and assertives get their own lines; only spaces change', () => {
  const s = 'Relacione a Coluna 1 à Coluna 2. Coluna 1 A. Dicoriônica. B. Monocoriônica. Coluna 2 ( ) Entre os dias 1 e 3. ( ) Entre os dias 8 e 13. A ordem correta, de cima para baixo, é:';
  const d = stemDisplay(s);
  assert.equal(d.length, s.length);
  assert.equal(d.replace(/\n/g, ' '), s);
  assert.deepEqual(d.split('\n'), ['Relacione a Coluna 1 à Coluna 2.', 'Coluna 1', 'A. Dicoriônica.', 'B. Monocoriônica.', 'Coluna 2',
    '( ) Entre os dias 1 e 3.', '( ) Entre os dias 8 e 13.', 'A ordem correta, de cima para baixo, é:']);
  assert.deepEqual(stemDisplay('Analise: I. Certo. II. Errado. Quais estão corretas?').split('\n'), ['Analise:', 'I. Certo.', 'II. Errado.', 'Quais estão corretas?']);
  const corrido = 'Homem com diabetes tipo II. Qual a conduta?';
  assert.equal(stemDisplay(corrido), corrido);
});
test('highlighting keeps working on the structured stem', () => {
  const s = 'Analise: I. Manguito pequeno subestima. II. Errado. Quais estão corretas?';
  const trecho = 'Manguito pequeno subestima';
  const partes = stemSegments(s, [{ inicio: s.indexOf(trecho), fim: s.indexOf(trecho) + trecho.length, trecho, porque: 'p' }], stemDisplay(s));
  assert.equal(partes.map(p => p.text).join(''), stemDisplay(s));
  assert.equal(partes.find(p => p.n).text, trecho);
});
