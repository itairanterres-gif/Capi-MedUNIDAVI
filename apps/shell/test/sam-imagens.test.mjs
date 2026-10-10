import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const codigo = await readFile(new URL('../../sam/site/sam-backend.js', import.meta.url), 'utf8');
const T = '11111111-2222-3333-4444-555555555555';
const PNG = 'data:image/png;base64,' + Buffer.from('png-falso').toString('base64');

function ambiente({ existentes = [], falhaUpload = false } = {}) {
  const log = { enviados: [], rpc: null, removidos: [] };
  const storage = { from: bucket => { assert.equal(bucket, 'sam-figuras'); return {
    upload: async (path, blob, opt) => { if (falhaUpload) return { error: { message: 'cota' } }; log.enviados.push({ path, tipo: blob.type, bytes: blob.size, opt }); return { error: null }; },
    list: async () => ({ data: existentes.map(name => ({ name })) }),
    remove: async nomes => { log.removidos.push(...nomes); return { error: null }; } }; } };
  const client = { storage, rpc: async (nome, args) => { log.rpc = { nome, args }; return { error: null }; } };
  const janela = { SAM_CONFIG: { backend: 'supabase', url: 'https://x.supabase.co', key: 'k', storageKey: 's', edicao: 'xii' },
    supabase: { createClient: () => client }, crypto: globalThis.crypto };
  vm.runInNewContext(codigo, { window: janela, atob, Uint8Array, Blob, crypto: globalThis.crypto, console });
  return { api: janela.SAM_BACKEND, log };
}

test('new images go to the work folder with random names; the RPC registers paths in order', async () => {
  const { api, log } = ambiente();
  const r = await api.salvarImagens(T, [{ dataUrl: PNG, secao: 'Métodos', titulo: 'A', legenda: 'a' }, { dataUrl: PNG, secao: 'Resultados' }], PNG);
  assert.equal(r.ok, true);
  assert.equal(log.enviados.length, 3);
  for (const e of log.enviados) { assert.match(e.path, new RegExp('^' + T + '/(fig[12]|foto)-[0-9a-f]{12}\.png$')); assert.equal(e.tipo, 'image/png'); assert.equal(e.opt.upsert, false); }
  assert.equal(new Set(log.enviados.map(e => e.path)).size, 3);
  assert.equal(log.rpc.nome, 'sam_salvar_figuras');
  assert.equal(JSON.stringify(log.rpc.args.figuras.map(f => f.secao)), JSON.stringify(['Métodos', 'Resultados']));
  assert.match(log.rpc.args.foto, new RegExp('^' + T + '/foto-'));
});

test('images already in Storage are kept by path (not re-uploaded) and leftovers are removed', async () => {
  const { api, log } = ambiente({ existentes: ['fig1-aaaaaaaaaaaa.png', 'velha-bbbbbbbbbbbb.png'] });
  const url = 'https://x.supabase.co/storage/v1/object/public/sam-figuras/' + T + '/fig1-aaaaaaaaaaaa.png';
  const r = await api.salvarImagens(T, [{ dataUrl: url, secao: 'Outra' }], '');
  assert.equal(r.ok, true);
  assert.equal(log.enviados.length, 0);
  assert.equal(JSON.stringify(log.rpc.args.figuras.map(f => f.path)), JSON.stringify([T + '/fig1-aaaaaaaaaaaa.png']));
  assert.equal(log.rpc.args.foto, null);
  assert.deepEqual(log.removidos, [T + '/velha-bbbbbbbbbbbb.png']);
});

test('formats other than PNG/JPG/WebP are refused before any upload, and upload errors are reported', async () => {
  let a = ambiente();
  let r = await a.api.salvarImagens(T, [{ dataUrl: 'data:text/html;base64,PGI+' }], '');
  assert.equal(r.ok, false); assert.match(r.erro, /Formato de imagem/); assert.equal(a.log.enviados.length, 0); assert.equal(a.log.rpc, null);
  a = ambiente({ falhaUpload: true });
  r = await a.api.salvarImagens(T, [{ dataUrl: PNG }], '');
  assert.equal(r.ok, false); assert.match(r.erro, /Não foi possível enviar/); assert.equal(a.log.rpc, null);
});
