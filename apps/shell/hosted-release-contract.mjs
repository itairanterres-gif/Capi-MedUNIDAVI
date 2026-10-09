import { readFileSync } from 'node:fs';
import { canonicalURL } from './auth-contract.mjs';
export const pilotQuestion = 'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2';
export const pilotImage = '2019/q085_pg19.png';
export const packageSHA = '0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40';
const required = ['canonicalIdentityVerified', 'participantIdentifiedEligible', 'pilotRlsVerified', 'noOtherContexts',
  'negativeSqlVerified', 'negativeHttpVerified', 'bucketPrivate', 'pathsTypesSizesVerified',
  'singleContentApproved', 'activationVerified', 'publicationApproved'];

// A reviewed build prerequisite, not authentication or a substitute for server RLS.
// No environment flag approves release; the checked-in receipt contains no identity.
export function validatePilotReadback(receipt, origin, now = Date.now()) {
  if (receipt?.version !== 1 || receipt.scope !== 'pilot' || receipt.project !== canonicalURL ||
      !['institutional-learner','individual-egresso'].includes(receipt.participantAccessMode) ||
      (receipt.participantAccessMode === 'individual-egresso' && receipt.checks?.individualAccessGrantVerified !== true) ||
      receipt.origin !== origin || receipt.questionId !== pilotQuestion || receipt.imagePath !== pilotImage ||
      receipt.packageSHA256 !== packageSHA || required.some(key => receipt.checks?.[key] !== true) ||
      !/^[a-f0-9]{64}$/.test(receipt.policyReadbackSHA256 || '') || receipt.wholeCorpusValidated === true ||
      !['not-yet-performed','passed-for-pilot'].includes(receipt.positiveJwtFlow) ||
      !(receipt.remoteDownloadedSHA256 === 'not-yet-performed' || /^[a-f0-9]{64}$/.test(receipt.remoteDownloadedSHA256 || '')))
    throw new Error('Private Supabase pilot pending: production build blocked');
  const checked = Date.parse(receipt.checkedAt), expires = Date.parse(receipt.expiresAt);
  if (!Number.isFinite(checked) || !Number.isFinite(expires) || checked > now || expires <= now ||
      expires - checked > 24 * 60 * 60 * 1000)
    throw new Error('Pilot readback expired or invalid: production build blocked');
  return {
    version: 1, scope: 'pilot', accessMode: receipt.participantAccessMode, state: 'ready-for-positive-test', project: canonicalURL,
    private: true, bucket: 'capi-amrigs-private', prefix: packageSHA,
    questionId: pilotQuestion, imagePaths: [pilotImage], expiresAt: receipt.expiresAt,
    verification: { scope: 'one-question-one-image', prerequisites: 'reviewed-readback',
      remoteDownloadedSHA256: receipt.remoteDownloadedSHA256,
      positiveJwtFlow: receipt.positiveJwtFlow, wholeCorpusValidated: false },
  };
}
// Liberação institucional (09/10/2026): todo aluno com matrícula, conjunto
// completo. O que cada aluno vê continua decidido no servidor (RLS:
// human_reviewed + student_visible + capi_amrigs_authorized()); este recibo
// só registra que a liberação remota foi feita e conferida pelo responsável.
export const releaseQuestionCount = 477;
const releaseRequired = ['questionsPromoted', 'imagesDeliveryEnabled', 'bucketPrivate', 'negativeSqlVerified',
  'studentEligibilityVerified', 'noOtherContexts', 'publicationApproved'];
export function validateReleaseReadback(receipt, origin, now = Date.now()) {
  if (receipt?.version !== 1 || receipt.scope !== 'release' || receipt.project !== canonicalURL ||
      receipt.participantAccessMode !== 'institutional-learner' || receipt.origin !== origin ||
      receipt.packageSHA256 !== packageSHA || receipt.questionCount !== releaseQuestionCount ||
      releaseRequired.some(key => receipt.checks?.[key] !== true) ||
      !/^[a-f0-9]{64}$/.test(receipt.policyReadbackSHA256 || '') ||
      !['not-yet-performed', 'passed'].includes(receipt.positiveJwtFlow) ||
      !['not-yet-performed', 'verified-all'].includes(receipt.remoteDownloadedSHA256))
    throw new Error('AMRIGS institutional release pending: production build blocked');
  const checked = Date.parse(receipt.checkedAt);
  if (!Number.isFinite(checked) || checked > now) throw new Error('Release readback date invalid: production build blocked');
  return {
    version: 1, scope: 'release', accessMode: 'institutional-learner', state: 'released', project: canonicalURL,
    private: true, bucket: 'capi-amrigs-private', prefix: packageSHA, questionCount: releaseQuestionCount,
    verification: { scope: 'institutional-release', prerequisites: 'reviewed-readback', checkedAt: receipt.checkedAt,
      remoteDownloadedSHA256: receipt.remoteDownloadedSHA256, positiveJwtFlow: receipt.positiveJwtFlow },
  };
}
function readInput(name) {
  try { return JSON.parse(readFileSync(new URL('../../build-inputs/amrigs/' + name, import.meta.url), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export function hostedReleaseContract(env, receipt) {
  if (env.CAPI_LOCAL_PREPARATION === '1' && env.CF_PAGES !== '1' && env.CI !== 'true') return null;
  if (env.CAPI_LOCAL_PREPARATION === '1') throw new Error('Local fixture forbidden in CI/Pages');
  const value = receipt ?? readInput('release-readback.json') ?? readInput('pilot-readback.json');
  return value?.scope === 'release'
    ? validateReleaseReadback(value, env.CAPI_PUBLIC_ORIGIN)
    : validatePilotReadback(value, env.CAPI_PUBLIC_ORIGIN);
}
