import test from 'node:test';
import assert from 'node:assert/strict';
import {loginDestination,safeDestination,clearDestination} from '../login-destination.mjs';
import {renderHome} from '../pages.mjs';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
test('activity survives Capi login callback and cancellation, and logout resets it',()=>{
 const s=storage();const next='/questoes/#/aluno/session-1';
 assert.equal(loginDestination('?next='+encodeURIComponent(next),s,100),next);
 assert.equal(loginDestination('?code=synthetic',s,101),next);
 assert.equal(loginDestination('?error=access_denied',s,102),next);
 clearDestination(s);assert.equal(loginDestination('',s,103),'/questoes/');
});
test('rejects external, encoded, query-bearing, unknown and expired destinations',()=>{
 const s=storage();
 for(const next of ['https://evil.test','//evil.test','/questoes//evil','/questoes/#//evil','/questoes/#/../admin','/questoes/?token=private','/questoes/#/aluno/%2f%2fevil','/treino/']){
  assert.equal(safeDestination(next),null);assert.equal(loginDestination('?next='+encodeURIComponent(next),s),'/questoes/');
 }
 loginDestination('?next='+encodeURIComponent('/questoes/#/cards'),s,100);assert.equal(loginDestination('',s,1800100),'/questoes/');
});
test('Capi launches existing ENAMED/AMRIGS origins without identity or token forwarding',()=>{
 const home=renderHome(true);
 assert.ok(home.includes('https://treino-enamed.onrender.com/#/enamed'));
 assert.ok(home.includes('https://treino-enamed.onrender.com/#/amrigs'));
 assert.ok(!home.includes('access_token='));assert.ok(!home.includes('refresh_token='));
});
test('SAM pages are valid login destinations; hostile variants are not',()=>{
 for(const ok of ['/sam/','/sam/submissao.html','/sam/curadoria.html','/sam/index.html#/trabalho/F8-A3B9','/sam/#/estacao/2','/sam/telao.html#/estacao/1'])
  assert.equal(safeDestination(ok),ok,ok);
 for(const bad of ['/sam','/sam/../questoes/','/sam/x.html','/sam/supabase/proposta/20261008120000_sam_xii.sql','/sam/dados-origem/contas-sinteticas-local.json','/sam/#//evil.test','/sam/#/../admin','/sam/submissao.html#/editar?id=1&token=2','/sam/index.html?x=1','https://evil.test/sam/'])
  assert.equal(safeDestination(bad),null,bad);
});
test('SAM pages are accepted with or without .html (Cloudflare serves them without)',()=>{
 for(const ok of ['/sam/submissao','/sam/curadoria','/sam/telao#/estacao/1','/sam/edicao','/sam/material','/sam/index#/trabalho/F8-A3B9'])
  assert.equal(safeDestination(ok),ok,ok);
 for(const bad of ['/sam/outra','/sam/submissao/x','/sam/submissao.htm','/sam/submissao?x=1','/sam/_validacao','/sam/Painéis LED'])
  assert.equal(safeDestination(bad),null,bad);
});
