import test from 'node:test';
import assert from 'node:assert/strict';
import { institutionalEmail, passwordProblem, enrollmentMessage, loginErrorMessage, returnURL } from '../account-flow.mjs';
import { renderLogin } from '../pages.mjs';

test('only institutional e-mails enter the single door', () => {
  assert.equal(institutionalEmail('  Aluna.Teste@UNIDAVI.edu.br '), 'aluna.teste@unidavi.edu.br');
  for (const bad of ['', 'a@gmail.com', 'a@unidavi.edu.br.evil.com', 'a b@unidavi.edu.br', 'a@sub.unidavi.edu.br', '@unidavi.edu.br'])
    assert.equal(institutionalEmail(bad), null, bad);
});

test('password rules match the Sessão (8+ chars, confirmation must match)', () => {
  assert.match(passwordProblem('1234567'), /8 caracteres/);
  assert.equal(passwordProblem('12345678'), null);
  assert.match(passwordProblem('12345678', '12345679'), /não são iguais/);
  assert.equal(passwordProblem('abcdefgh', 'abcdefgh'), null);
  assert.match(passwordProblem('x'.repeat(129)), /máximo/);
});

test('enrollment status from the database drives sign-up', () => {
  assert.equal(enrollmentMessage('disponivel'), null);
  assert.match(enrollmentMessage('conta_existente'), /já tem conta/);
  assert.match(enrollmentMessage('nao_encontrada'), /matrícula/);
  assert.match(enrollmentMessage(undefined), /Não foi possível verificar/);
});

test('login errors are explained without leaking details', () => {
  assert.deepEqual(loginErrorMessage({ message: 'Email not confirmed' }).resend, true);
  assert.match(loginErrorMessage({ message: 'Invalid login credentials' }).message, /incorretos/);
  assert.match(loginErrorMessage({ message: 'database exploded at row 42' }).message, /Não foi possível entrar/);
  assert.equal(returnURL('https://capi-medunidavi.pages.dev'), 'https://capi-medunidavi.pages.dev/entrar/');
});

test('entrance page offers sign-in, sign-up, recovery and new password — no detour to the Sessão', () => {
  const html = renderLogin();
  for (const id of ['login-form', 'signup-form', 'forgot-form', 'newpass-form', 'show-signup', 'show-forgot', 'google'])
    assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(!html.includes('href="/questoes/">Recuperar'), 'old detour removed');
  assert.match(html, /minlength="8"/);
});

test('existing accounts outside the UNIDAVI domain can still sign in; only sign-up requires it', async () => {
  const { anyEmail } = await import('../account-flow.mjs');
  assert.equal(anyEmail(' Coord@Gmail.com '), 'coord@gmail.com');
  assert.equal(anyEmail('sem-arroba'), null);
  assert.equal(institutionalEmail('coord@gmail.com'), null);
});
