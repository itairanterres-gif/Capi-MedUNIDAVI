import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPrivateImageView, privateImageMessage } from '../apps/shell/private-image-ui.mjs';
const bytes = new Uint8Array([137,80,78,71,13,10,26,10,0]); // synthetic signature, mocked decode
const hashes = {'2019/q085_pg19.png':createHash('sha256').update(bytes).digest('hex')};
const contract = { scope:'pilot', state:'ready-for-positive-test', private:true, project:'https://ggjxbumtnizaeomioves.supabase.co', bucket:'capi-amrigs-private', prefix:'0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40', questionId:'efa5a06b-83ea-53df-8b1e-7a67fe5d22c2', imagePaths:['2019/q085_pg19.png'], expiresAt:new Date(Date.now()+60000).toISOString() };
function setup({status, deferred, auth=true}={}) {
  const calls=[], revoked=[], created=[];
  const document={createElement(tag){return {tag,children:[],hidden:false,textContent:'',
    append(...n){this.children.push(...n)},setAttribute(){},removeAttribute(name){if(name==='src')this._src=''},
    get src(){return this._src},set src(value){this._src=value;queueMicrotask(()=>this.onload?.())}}}};
  const client={auth:{getUser:async()=>({data:{user:auth?{id:'synthetic-user'}:null}})},storage:{from(bucket){
    calls.push(bucket);return {download:async path=>{calls.push(path); if(deferred)await deferred;
      return status?{error:{statusCode:status,message:'synthetic-token-must-not-leak'}}:{data:new Blob([bytes])};}}}}};
  const urls={createObjectURL(){const u='blob:synthetic-'+created.length;created.push(u);return u},revokeObjectURL(u){revoked.push(u)}};
  const view=createPrivateImageView({client,contract,hashes,document,urls});
  return {view,calls,revoked,created};
}
const images=[{url:'/amrigs/2019/q085_pg19.png'}];
test('authorized download displays blob and clears/revokes on logout/navigation',async()=>{
  const x=setup();let ready=false;const mounted=x.view.mount(images,{onReady:v=>ready=v});
  assert.equal(await mounted.ready,true); assert.equal(ready,true);
  const img=mounted.nodes[0].children[0]; assert.equal(img.hidden,false);assert.match(img.src,/^blob:/);
  assert.deepEqual(x.calls,['capi-amrigs-private',contract.prefix+'/2019/q085_pg19.png']);
  x.view.clear();assert.deepEqual(x.revoked,x.created);assert.equal(img.src,'');
});
test('403, 404 and expired authentication never fall back or expose SDK errors',async()=>{
  for(const status of [401,403,404]){
    const x=setup({status});const m=x.view.mount(images);assert.equal(await m.ready,false);
    assert.equal(m.nodes[0].children[2].textContent,privateImageMessage);assert.deepEqual(x.created,[]);
    assert.equal(m.nodes[0].children[0].src,'');
  }
  const x=setup({auth:false});assert.equal(await x.view.mount(images).ready,false);assert.deepEqual(x.calls,[]);
});
test('late download after logout cannot create URL or mark new question ready',async()=>{
  let resolve;const deferred=new Promise(r=>resolve=r);const x=setup({deferred});let readyCalled=false;
  const m=x.view.mount(images,{onReady:()=>readyCalled=true});x.view.clear();resolve();
  assert.equal(await m.ready,false);assert.equal(readyCalled,false);assert.deepEqual(x.created,[]);
});
test('external URL and traversal fail without storage access',async()=>{
  for(const url of ['https://example.test/x.png','/amrigs/2024/../x.png']){
    const x=setup();assert.equal(await x.view.mount([{url}]).ready,false);assert.deepEqual(x.calls,[]);
  }
});
