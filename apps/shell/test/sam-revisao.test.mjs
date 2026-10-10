import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// revisao.js roda no navegador (script clássico): carregado aqui do mesmo jeito.
const janela = { SAM_ESQUEMA: { camposTexto: () => [
  { chave: 'intro', rotulo: 'Introdução' }, { chave: 'objetivos', rotulo: 'Objetivo' },
  { chave: 'metodos', rotulo: 'Metodologia' }, { chave: 'resultados', rotulo: 'Resultados esperados' }] } };
vm.runInNewContext(readFileSync(new URL('../../sam/site/revisao.js', import.meta.url), 'utf8'), { window: janela, Image: class {}, setTimeout, clearTimeout });
const { revisar, duplicados, dadosDoTrabalho } = janela.SAM_REVISAO;
const palavras = (n, p = 'palavra') => Array.from({ length: n }, (_, i) => p + i).join(' ');
const textos = r => r.map(s => s.texto).join(' | ');

test('fields not filled are listed; a complete 7th-phase text of ~300 words has no warnings', async () => {
  const vazio = await revisar(dadosDoTrabalho({ fase: 7, desenho: 'Estudo transversal', titulo: 'T', autores: 'A', intro: '', objetivos: '', metodos: '', resultados: '', palavras: '', referencias: '' }, []));
  assert.match(textos(vazio), /Ainda não preenchido: .*Introdução.*Palavras-chave.*Referências/);
  const ok = await revisar(dadosDoTrabalho({ fase: 7, desenho: 'Estudo transversal', titulo: 'T', autores: ['A'], intro: palavras(80, 'a'), objetivos: 'Objetivo curto.', metodos: palavras(110, 'b'), resultados: palavras(100, 'c'), palavras: ['a', 'b'], referencias: 'Ref' }, []));
  assert.equal(ok.length, 0, textos(ok));
});

test('a paragraph pasted twice is flagged; the repetition of a short phrase is not', async () => {
  const paragrafo = palavras(30);
  const dup = await revisar(dadosDoTrabalho({ fase: 7, desenho: 'x', titulo: 'T', autores: 'A', intro: paragrafo, objetivos: 'o', metodos: 'm', resultados: paragrafo, palavras: 'a', referencias: 'r' }, []));
  assert.match(textos(dup), /Trecho de 30 palavras aparece duas vezes/);
  assert.equal(duplicados([{ rotulo: 'A', texto: palavras(24) + ' ' + palavras(24) }]).length, 0);
});

test('length and showcase warnings are information, and the review never alters the input', async () => {
  const entrada = dadosDoTrabalho({ fase: 7, desenho: 'x', titulo: 'T', autores: 'A', intro: palavras(10), objetivos: 'x'.repeat(450), metodos: 'm', resultados: 'r', palavras: 'a', referencias: 'r' }, []);
  const antes = JSON.stringify(entrada);
  const r = await revisar(entrada);
  assert.equal(JSON.stringify(entrada), antes);
  assert.ok(r.some(s => s.nivel === 'info' && /palavras; a extensão sugerida/.test(s.texto)));
  assert.ok(r.some(s => s.nivel === 'info' && /vitrine/.test(s.texto)));
  assert.ok(r.every(s => !/55/.test(s.texto)), 'sem tamanho de painel fixo nos avisos');
});

test('8th phase only checks the abstract, with no figure or length rules', async () => {
  const d = dadosDoTrabalho({ fase: 8, resumo: '' }, [{ src: 'x' }]);
  assert.equal(d.figuras.length, 0); assert.equal(d.totalPalavras, null);
  assert.match(textos(await revisar(d)), /Ainda não preenchido: Resumo/);
});
