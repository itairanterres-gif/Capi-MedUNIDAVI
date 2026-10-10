// Grifo das pistas-chave: corta o enunciado em pedaços, marcando os trechos
// grifados (numerados na ordem do texto). Nada de HTML aqui: quem monta a tela
// usa textContent. Um grifo que não bate letra por letra com o enunciado é
// ignorado inteiro — melhor sem grifo do que grifo no lugar errado.
export function stemSegments(stem, clues, exibicao = String(stem ?? '')) {
  const texto = String(stem ?? '');
  const ver = exibicao.length === texto.length ? exibicao : texto;
  if (!Array.isArray(clues) || clues.some(c => !c || typeof c !== 'object')) return [{ text: ver }];
  const lista = [...clues].sort((a, b) => a.inicio - b.inicio);
  let pos = 0;
  for (const c of lista) {
    const ok = Number.isInteger(c?.inicio) && Number.isInteger(c?.fim) && c.inicio >= pos && c.fim > c.inicio
      && c.fim <= texto.length && texto.slice(c.inicio, c.fim) === c.trecho;
    if (!ok) return [{ text: ver }];
    pos = c.fim;
  }
  const partes = [];
  pos = 0;
  lista.forEach((c, i) => {
    if (c.inicio > pos) partes.push({ text: ver.slice(pos, c.inicio) });
    partes.push({ text: ver.slice(c.inicio, c.fim), n: i + 1, porque: String(c.porque || '') });
    pos = c.fim;
  });
  if (pos < texto.length) partes.push({ text: ver.slice(pos) });
  return partes;
}

// SHA-256 hexadecimal do enunciado (o mesmo calculado quando o grifo foi feito).
export async function stemHash(stem, subtle = globalThis.crypto.subtle) {
  const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(String(stem ?? '')));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Grifo utilizável para esta questão: ativo, do mesmo enunciado e alinhado.
export async function usableClues(question, row, subtle) {
  if (!row || !Array.isArray(row.clues) || !row.clues.length) return null;
  if (row.stem_sha256 !== await stemHash(question.body.stem, subtle)) return null;
  const partes = stemSegments(question.body.stem, row.clues, stemDisplay(question.body.stem));
  return partes.some(p => p.n) ? partes : null;
}

// Estrutura do enunciado na tela. A extração das provas juntou numa linha só
// as colunas de associação, os itens "( )" e as afirmativas I, II, III. Aqui
// só ESPAÇOS viram quebra de linha: o texto tem o mesmo tamanho e as mesmas
// letras, então os grifos (por posição) continuam valendo.
export function stemDisplay(stem) {
  const texto = String(stem ?? '');
  const quebras = new Set();
  const antes = re => { for (const m of texto.matchAll(re)) if (texto[m.index] === ' ') quebras.add(m.index); };
  const item = String.raw`(?:\d{1,2}|[A-H])\. `;
  const colunas = new RegExp(String.raw`\sColuna \d (?=${item}|\(\s*\))`).test(texto);
  if (colunas) {
    antes(new RegExp(String.raw` (?=Coluna \d (?:${item}|\(\s*\)))`, 'g'));
    for (const m of texto.matchAll(new RegExp(String.raw`Coluna \d( )(?=${item}|\(\s*\))`, 'g'))) quebras.add(m.index + m[0].length - 1);
    antes(/ (?=\(\s*\) )/g);
    // Itens "1." / "A." só dentro da Coluna 1 (evita "dias 8 e 13. A ordem…").
    const c1 = texto.search(new RegExp(String.raw`Coluna 1 (?=${item})`)), c2 = texto.search(/ Coluna 2 /);
    if (c1 >= 0) for (const m of texto.matchAll(new RegExp(String.raw` (?=${item}[A-ZÁÉÍÓÚÂÊÔÃÕÇ“"])`, 'g')))
      if (m.index > c1 && (c2 < 0 || m.index < c2)) quebras.add(m.index);
  }
  const romanos = / I\. /.test(texto) && / II\. /.test(texto);
  if (romanos) {
    antes(/ (?=(?:I|II|III|IV|V|VI)\. )/g);
    for (const m of texto.matchAll(/ PORQUE /g)) { quebras.add(m.index); quebras.add(m.index + 7); }
  }
  // Pergunta final em linha própria quando houve lista.
  if (quebras.size) {
    const m = [...texto.matchAll(/[.!?”"] (?=[^.!?]*[:?]\s*$)/g)].pop();
    if (m) quebras.add(m.index + m[0].length - 1);
  }
  return texto.split('').map((c, i) => quebras.has(i) ? '\n' : c).join('');
}
