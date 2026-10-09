import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseReadback, hostedReleaseContract, packageSHA, releaseQuestionCount } from '../hosted-release-contract.mjs';
import { releasedContract, currentPilotContract, pilotQuestionAllowed, imageAllowed } from '../pilot-runtime.mjs';
import { canonicalURL } from '../auth-contract.mjs';

const origin = 'https://capi-medunidavi.pages.dev';
const recibo = (over = {}) => ({
  version: 1, scope: 'release', project: canonicalURL, participantAccessMode: 'institutional-learner', origin,
  packageSHA256: packageSHA, questionCount: releaseQuestionCount, policyReadbackSHA256: 'a'.repeat(64),
  checkedAt: '2026-10-09T12:00:00Z', positiveJwtFlow: 'not-yet-performed', remoteDownloadedSHA256: 'not-yet-performed',
  checks: { questionsPromoted: true, imagesDeliveryEnabled: true, bucketPrivate: true, negativeSqlVerified: true,
    studentEligibilityVerified: true, noOtherContexts: true, publicationApproved: true },
  ...over,
});
const agora = Date.parse('2026-10-09T13:00:00Z');

test('institutional release receipt yields a non-expiring released contract', () => {
  const c = validateReleaseReadback(recibo(), origin, agora);
  assert.equal(c.scope, 'release');
  assert.equal(c.state, 'released');
  assert.equal(c.questionCount, 477);
  assert.equal(c.expiresAt, undefined);
  assert.equal(releasedContract(c), true);
  assert.equal(currentPilotContract(c, agora + 365 * 86400000), true);
  // Sem "now" explícito, usa o relógio real: recibo conferido no passado.
  assert.equal(hostedReleaseContract({ CAPI_PUBLIC_ORIGIN: origin }, recibo({ checkedAt: '2026-10-01T00:00:00Z' })).scope, 'release');
});

test('release is blocked until every remote check is confirmed and bound to the exact origin', () => {
  for (const key of Object.keys(recibo().checks))
    assert.throws(() => validateReleaseReadback(recibo({ checks: { ...recibo().checks, [key]: false } }), origin, agora), /pending/, key);
  for (const over of [{ origin: 'https://outro.pages.dev' }, { questionCount: 476 }, { project: 'https://x.supabase.co' },
    { participantAccessMode: 'individual-egresso' }, { packageSHA256: 'b'.repeat(64) }, { policyReadbackSHA256: null },
    { positiveJwtFlow: 'assumed' }, { remoteDownloadedSHA256: 'skipped' }, { scope: 'pilot' }])
    assert.throws(() => validateReleaseReadback(recibo(over), origin, agora), Error, JSON.stringify(over));
  assert.throws(() => validateReleaseReadback(recibo({ checkedAt: '2026-10-10T00:00:00Z' }), origin, agora), /date invalid/);
  assert.throws(() => validateReleaseReadback(recibo({ checkedAt: 'ontem' }), origin, agora), /date invalid/);
});

test('released contract trusts server RLS for questions but only manifest images', () => {
  const c = validateReleaseReadback(recibo(), origin, agora);
  const hashes = { '2019/q085_pg19.png': 'x', '2024/q060_pagina17_integral.png': 'y' };
  assert.equal(pilotQuestionAllowed(c, 'qualquer-id-devolvido-pelo-servidor'), true);
  assert.equal(pilotQuestionAllowed(c, ''), false);
  assert.equal(imageAllowed(c, '2024/q060_pagina17_integral.png', hashes), true);
  assert.equal(imageAllowed(c, '2020/fora-do-manifesto.png', hashes), false);
  // Contrato adulterado no navegador não vira liberação.
  assert.equal(releasedContract({ ...c, bucket: 'publico' }), false);
  assert.equal(releasedContract({ ...c, project: 'https://x.supabase.co' }), false);
});

test('pilot contract keeps its single question and image', () => {
  const pilot = { scope: 'pilot', state: 'ready-for-positive-test', project: canonicalURL, private: true,
    bucket: 'capi-amrigs-private', prefix: packageSHA, questionId: 'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2',
    imagePaths: ['2019/q085_pg19.png'], expiresAt: new Date(Date.now() + 3600000).toISOString() };
  const hashes = { '2019/q085_pg19.png': 'x', '2024/q060_pagina17_integral.png': 'y' };
  assert.equal(pilotQuestionAllowed(pilot, 'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2'), true);
  assert.equal(pilotQuestionAllowed(pilot, 'outra'), false);
  assert.equal(imageAllowed(pilot, '2019/q085_pg19.png', hashes), true);
  assert.equal(imageAllowed(pilot, '2024/q060_pagina17_integral.png', hashes), false);
});
