import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePilotReadback, hostedReleaseContract, pilotQuestion, pilotImage, packageSHA } from '../apps/shell/hosted-release-contract.mjs';
import { currentPilotContract, pilotQuestionAllowed } from '../apps/shell/pilot-runtime.mjs';
import { resolveIdentity } from '../apps/shell/auth-contract.mjs';
const now=Date.now(), origin='https://pilot.unidavi.edu.br';
function receipt() { return {
 version:1,scope:'pilot',participantAccessMode:'institutional-learner',project:'https://ggjxbumtnizaeomioves.supabase.co',origin,
 questionId:pilotQuestion,imagePath:pilotImage,packageSHA256:packageSHA,
 checks:Object.fromEntries(['canonicalIdentityVerified','participantIdentifiedEligible','pilotRlsVerified','noOtherContexts',
 'negativeSqlVerified','negativeHttpVerified','bucketPrivate','pathsTypesSizesVerified',
 'singleContentApproved','activationVerified','publicationApproved'].map(k=>[k,true])),
 policyReadbackSHA256:'a'.repeat(64),checkedAt:new Date(now-1000).toISOString(),
 expiresAt:new Date(now+60000).toISOString(),remoteDownloadedSHA256:'not-yet-performed',positiveJwtFlow:'not-yet-performed'
 }; }
test('pending identity or unknown context and unreviewed policy block build',()=>{
 for(const key of ['participantIdentifiedEligible','noOtherContexts','pilotRlsVerified','activationVerified']) {
  const r=receipt();r.checks[key]=false;assert.throws(()=>validatePilotReadback(r,origin,now),/blocked/);
 }
 assert.throws(()=>hostedReleaseContract({CAPI_PUBLIC_ORIGIN:origin,CAPI_LOCAL_PREPARATION:'0'}),/blocked/);
});
test('readback binds project, origin, one question/image and bounded test period',()=>{
 for(const [key,value] of [['scope','corpus'],['questionId','other'],['imagePath','2024/q060_pagina17_integral.png'],['origin','https://other.edu.br']])
  assert.throws(()=>validatePilotReadback({...receipt(),[key]:value},origin,now));
 assert.throws(()=>validatePilotReadback({...receipt(),expiresAt:new Date(now-1).toISOString()},origin,now));
 assert.throws(()=>validatePilotReadback({...receipt(),expiresAt:new Date(now+86400001).toISOString()},origin,now));
});
test('successful synthetic readback remains scoped and does not claim positive flow or remote hashes',()=>{
 const c=validatePilotReadback(receipt(),origin,now);
 assert.equal(currentPilotContract(c,now),true);assert.equal(pilotQuestionAllowed(c,pilotQuestion),true);
 assert.equal(pilotQuestionAllowed(c,'other'),false);assert.equal(currentPilotContract(c,now+60001),false);
 assert.equal(c.verification.wholeCorpusValidated,false);
 assert.equal(c.verification.remoteDownloadedSHA256,'not-yet-performed');
 assert.equal(c.verification.positiveJwtFlow,'not-yet-performed');
 assert.ok(!JSON.stringify(c).includes('participantIdentifiedEligible'));
});
test('fixture cannot bypass build gate on Pages',()=>{
 assert.throws(()=>hostedReleaseContract({CAPI_LOCAL_PREPARATION:'1',CF_PAGES:'1'}),/forbidden/);
 assert.equal(hostedReleaseContract({CAPI_LOCAL_PREPARATION:'1'}),null);
});
test('future neutral egresso presentation does not require changing senha_definida',async()=>{
 const profile={id:'synthetic',nome:'Synthetic participant',role:'egresso',senha_definida:false};
 const client={auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{id:'synthetic'}}})},
 from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile})})})})};
 const identity=await resolveIdentity(client);
 assert.equal(identity.role,'egresso');assert.equal(identity.perspective,null);
 assert.equal(profile.senha_definida,false);
 // This only verifies presentation; it creates no account and grants no server access.
});

test('egresso needs canonical identity AND a reviewed individual grant',()=>{
 const r={...receipt(),participantAccessMode:'individual-egresso'};
 assert.throws(()=>validatePilotReadback(r,origin,now),/blocked/);
 r.checks.individualAccessGrantVerified=true;assert.equal(validatePilotReadback(r,origin,now).accessMode,'individual-egresso');
 r.checks.canonicalIdentityVerified=false;assert.throws(()=>validatePilotReadback(r,origin,now),/blocked/);
});
