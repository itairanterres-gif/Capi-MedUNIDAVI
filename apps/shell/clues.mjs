// Grifo das pistas-chave: corta o enunciado em pedaços, marcando os trechos
// grifados (numerados na ordem do texto). Nada de HTML aqui: quem monta a tela
// usa textContent. Um grifo que não bate letra por letra com o enunciado é
// ignorado inteiro — melhor sem grifo do que grifo no lugar errado.
export function stemSegments(stem, clues) {
  const texto = String(stem ?? '');
  if (!Array.isArray(clues) || clues.some(c => !c || typeof c !== 'object')) return [{ text: texto }];
  const lista = [...clues].sort((a, b) => a.inicio - b.inicio);
  let pos = 0;
  for (const c of lista) {
    const ok = Number.isInteger(c?.inicio) && Number.isInteger(c?.fim) && c.inicio >= pos && c.fim > c.inicio
      && c.fim <= texto.length && texto.slice(c.inicio, c.fim) === c.trecho;
    if (!ok) return [{ text: texto }];
    pos = c.fim;
  }
  const partes = [];
  pos = 0;
  lista.forEach((c, i) => {
    if (c.inicio > pos) partes.push({ text: texto.slice(pos, c.inicio) });
    partes.push({ text: c.trecho, n: i + 1, porque: String(c.porque || '') });
    pos = c.fim;
  });
  if (pos < texto.length) partes.push({ text: texto.slice(pos) });
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
  const partes = stemSegments(question.body.stem, row.clues);
  return partes.some(p => p.n) ? partes : null;
}
