import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadPrivateImage } from '../apps/shell/private-images.mjs';
import { hostedReleaseContract as requireLocalImageFixture } from '../apps/shell/hosted-release-contract.mjs';
test('production and CI cannot bypass unprovisioned private images', () => {
  for (const env of [{}, { CAPI_LOCAL_PREPARATION:'1', CF_PAGES:'1' }, { CAPI_LOCAL_PREPARATION:'1', CI:'true' }])
    assert.throws(() => requireLocalImageFixture(env), /production build blocked|forbidden/);
  requireLocalImageFixture({ CAPI_LOCAL_PREPARATION:'1' });
});
const contract = { scope:'pilot', state:'ready-for-positive-test', private:true, project:'https://ggjxbumtnizaeomioves.supabase.co', bucket:'capi-amrigs-private', prefix:'0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40', questionId:'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2', imagePaths:['2019/q085_pg19.png'], expiresAt:new Date(Date.now()+60000).toISOString() };
test('incomplete contract and unapproved paths never call storage', async () => {
  await assert.rejects(downloadPrivateImage({}, {}, '2019/q085_pg19.png', {}), /incomplete/);
  for (const name of ['../x.png', '2019/q085_pg19.png', 'https://example.test/x.png'])
    await assert.rejects(downloadPrivateImage({}, contract, name, {}), /manifest/);
});
test('anonymous user and storage denial fail closed', async () => {
  const hashes = {'2019/q085_pg19.png':'a'.repeat(64)};
  await assert.rejects(downloadPrivateImage({auth:{getUser:async()=>({data:{user:null}})}}, contract,'2019/q085_pg19.png',hashes),/Authentication/);
  const client = {auth:{getUser:async()=>({data:{user:{id:'fixture'}}})},storage:{from:()=>({download:async name=>{
    assert.equal(name,contract.prefix+'/2019/q085_pg19.png'); return {error:new Error('denied')};
  }})}};
  await assert.rejects(downloadPrivateImage(client,contract,'2019/q085_pg19.png',hashes),/unavailable/);
});
test('tampered PNG rejected after authenticated download', async () => {
  const client={auth:{getUser:async()=>({data:{user:{id:'fixture'}}})},storage:{from:()=>({download:async()=>({data:new Blob([new Uint8Array([137,80,78,71,13,10,26,10,1])])})})}};
  await assert.rejects(downloadPrivateImage(client,contract,'2019/q085_pg19.png',{'2019/q085_pg19.png':'a'.repeat(64)}),/hash mismatch/);
});
