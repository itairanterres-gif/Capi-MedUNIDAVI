import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, errorNotebook, latestAttempts, pending } from '../amrigs-core.mjs';

const questions = ['new', 'wrong', 'mastered'].map(id => ({ id, body: { area: 'Clínica Médica', source: 'AMRIGS · 2026 · Teste' } }));
const config = { quantity: 3, areas: [], years: [], priority: 'erros' };
test('legacy wrong answers are prioritized, and a later correct answer clears the notebook', () => {
  const attempts = [{ question_id: 'wrong', is_correct: false },
    { question_id: 'mastered', is_correct: false }, { question_id: 'mastered', is_correct: true }];
  assert.deepEqual(errorNotebook(questions, attempts).map(q => q.id), ['wrong']);
  const session = buildSession(questions, attempts, config, () => 0);
  assert.deepEqual(session.questionIds, ['wrong', 'new', 'mastered']);
  assert.deepEqual(pending({ ...session, answered: { wrong: false } }), ['new', 'mastered']);
  attempts.push({ question_id: 'wrong', is_correct: true });
  assert.deepEqual(errorNotebook(questions, attempts), []);
});
test('a new wrong answer returns a previously correct question to the notebook and error priority', () => {
  const attempts = [
    { id: 'a', question_id: 'mastered', is_correct: false, created_at: '2026-10-06T10:00:00Z' },
    { id: 'b', question_id: 'mastered', is_correct: true, created_at: '2026-10-06T10:01:00Z' },
  ];
  assert.deepEqual(errorNotebook(questions, attempts), []);
  attempts.push({ id: 'c', question_id: 'mastered', is_correct: false, created_at: '2026-10-06T10:02:00Z' });
  const before = structuredClone(attempts);
  assert.deepEqual(errorNotebook(questions, [...attempts].reverse()).map(q => q.id), ['mastered']);
  assert.equal(buildSession(questions, attempts, config, () => 0).questionIds[0], 'mastered');
  assert.deepEqual(attempts, before);
});
test('correct then wrong, and wrong then correct, follow timestamps rather than input order', () => {
  const early = { id: 'a', question_id: 'wrong', created_at: '2026-10-06T10:00:00Z' };
  const late = { id: 'b', question_id: 'wrong', created_at: '2026-10-06T10:01:00Z' };
  assert.deepEqual(errorNotebook(questions, [{ ...late, is_correct: false }, { ...early, is_correct: true }]).map(q => q.id), ['wrong']);
  assert.deepEqual(errorNotebook(questions, [{ ...late, is_correct: true }, { ...early, is_correct: false }]), []);
});
test('equal timestamps use attempt ID as a stable tie break, independent of read order', () => {
  const a = { id: '00000000-0000-0000-0000-000000000001', question_id: 'wrong', is_correct: true, created_at: '2026-10-06T10:00:00.123456Z' };
  const b = { ...a, id: '00000000-0000-0000-0000-000000000002', is_correct: false };
  assert.equal(latestAttempts([b, a]).get('wrong').id, b.id);
  assert.equal(latestAttempts([a, b]).get('wrong').id, b.id);
});
test('Postgres microseconds take precedence over the attempt ID', () => {
  const a = { id: 'z', question_id: 'wrong', is_correct: false, created_at: '2026-10-06T10:00:00.123456Z' };
  const b = { ...a, id: 'a', is_correct: true, created_at: '2026-10-06T10:00:00.123457Z' };
  assert.deepEqual(errorNotebook(questions, [b, a]), []);
});
