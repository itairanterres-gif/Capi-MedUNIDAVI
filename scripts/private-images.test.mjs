import test from 'node:test';
import assert from 'node:assert/strict';
import { requireLocalImageFixture, downloadPrivateImage } from '../apps/shell/private-images.mjs';
test('production and CI cannot bypass unprovisioned private images', () => {
  for (const env of [{}, { CAPI_LOCAL_PREPARATION:'1', CF_PAGES:'1' }, { CAPI_LOCAL_PREPARATION:'1', CI:'true' }])
    assert.throws(() => requireLocalImageFixture(env), /production build blocked/);
  requireLocalImageFixture({ CAPI_LOCAL_PREPARATION:'1' });
});
const contract = { state:'verified', private:true, bucket:'test-private', prefix:'a'.repeat(64) };
test('incomplete contract and unapproved paths never call storage', async () => {
  await assert.rejects(downloadPrivateImage({}, {}, '2024/x.png', {}), /incomplete/);
  for (const name of ['../x.png', '2024/x.png', 'https://example.test/x.png'])
    await assert.rejects(downloadPrivateImage({}, contract, name, {}), /manifest/);
});
test('anonymous user and storage denial fail closed', async () => {
  const hashes = {'2024/x.png':'a'.repeat(64)};
  await assert.rejects(downloadPrivateImage({auth:{getUser:async()=>({data:{user:null}})}}, contract,'2024/x.png',hashes),/Authentication/);
  const client = {auth:{getUser:async()=>({data:{user:{id:'fixture'}}})},storage:{from:()=>({download:async name=>{
    assert.equal(name,'a'.repeat(64)+'/2024/x.png'); return {error:new Error('denied')};
  }})}};
  await assert.rejects(downloadPrivateImage(client,contract,'2024/x.png',hashes),/unavailable/);
});
test('tampered PNG rejected after authenticated download', async () => {
  const client={auth:{getUser:async()=>({data:{user:{id:'fixture'}}})},storage:{from:()=>({download:async()=>({data:new Blob([new Uint8Array([137,80,78,71,13,10,26,10,1])])})})}};
  await assert.rejects(downloadPrivateImage(client,contract,'2024/x.png',{'2024/x.png':'a'.repeat(64)}),/hash mismatch/);
});
