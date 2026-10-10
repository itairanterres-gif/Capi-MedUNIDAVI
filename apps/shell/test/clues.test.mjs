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
