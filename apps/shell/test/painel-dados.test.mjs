import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
// dados.js roda no navegador (script clássico): carregado aqui do mesmo jeito.
const janela = {};
vm.runInNewContext(readFileSync(new URL('../../sam/painel-touch/dados.js', import.meta.url), 'utf8'), { window: janela });
const { paraPainel } = janela.SAM_PAINEL_DADOS;

const doBanco = {
  id: 'F7-AB12CD', fase: 7, area: 'Cardiologia', titulo: 'Título exato  com  espaços', autor: 'Aluna Teste',
  autores: ['Aluna Teste', 'Colega Teste'], orientador: 'Prof. Teste', afiliacao: 'NPCMed', desenho: 'Estudo transversal',
  introducao: 'Intro.\n\nSegundo parágrafo.', objetivos: 'Obj.', metodos: 'Met.', resultados: 'Res.', conclusao: '',
  resumo_completo: '', palavras: ['a', 'b'], referencias: 'Ref 1\nRef 2',
  figuras: [{ ordem: 2, secao: 'Outra', titulo: 'F2', legenda: 'l2', url: 'https://x/2.png', principal: false },
            { ordem: 1, secao: 'Introdução', titulo: 'F1', legenda: 'l1', url: 'https://x/1.png', principal: true }],
};

test('database work becomes the panel format without touching a single character of student text', () => {
  const p = paraPainel(doBanco);
  for (const campo of ['titulo', 'autor', 'orientador', 'afiliacao', 'introducao', 'objetivos', 'metodos', 'resultados', 'referencias'])
    assert.equal(p[campo], doBanco[campo], campo);
  assert.equal(JSON.stringify(p.autores), JSON.stringify(doBanco.autores));
  assert.equal(JSON.stringify(p.palavras), JSON.stringify(doBanco.palavras));
  assert.equal(p.camada, 'poster_tc1'); assert.equal(p.statusCuradoria, 'publicado');
  assert.equal(p.figuras.length, 2); assert.equal(p.figuras.find(f => f.principal).url, 'https://x/1.png');
});

test('8th phase is not a poster; missing fields become empty text, never invented', () => {
  const p = paraPainel({ id: 'F8-X', fase: 8, titulo: 'T' });
  assert.equal(p.camada, 'oral_tc2');
  for (const campo of ['introducao', 'objetivos', 'metodos', 'resultados', 'conclusao', 'referencias', 'orientador', 'area'])
    assert.equal(p[campo], '', campo);
  assert.equal(p.autores.length, 0); assert.equal(p.figuras.length, 0);
});
