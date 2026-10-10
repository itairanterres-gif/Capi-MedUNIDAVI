/* ============================================================
   SAM — REVISÃO ANTES DO PAINEL (submissão e curadoria)
   Aponta o que o aluno ou a curadora devem conferir antes de o
   pôster ir para o painel touch. NUNCA altera o texto: só lê e
   sinaliza. Nenhum aviso bloqueia o envio; quem decide é o aluno
   (na submissão) e a curadora (ao liberar ou devolver).

   Entrada normalizada:
     { campos: [{ rotulo, texto, obrigatorio }], figuras: [{ src, titulo, legenda }],
       totalPalavras: [min, max] | null }
   Saída: [{ nivel: "importante" | "atencao" | "info", texto }]
   ============================================================ */
(function () {
  const palavrasDe = (s) => String(s || "").split(/\s+/).filter(Boolean);

  /* Sequências de 25+ palavras iguais em dois pontos do texto: quase
     sempre um parágrafo colado duas vezes. Repetições curtas (o objetivo
     retomado nos resultados) são normais e não são apontadas. */
  function duplicados(campos, n = 25) {
    const w = [], de = [];
    campos.forEach((c) => palavrasDe(c.texto).forEach((p) => { w.push(p.toLowerCase()); de.push(c.rotulo); }));
    const vistos = new Map(), achados = [];
    for (let i = 0; i + n <= w.length; i++) {
      const k = w.slice(i, i + n).join(" ");
      const j = vistos.get(k);
      if (j == null) { vistos.set(k, i); continue; }
      if (i - j < n) continue;
      let fim = i + n;
      while (fim < w.length && w[fim] === w[j + fim - i]) fim++;
      achados.push({ palavras: fim - i, em: de[i], original: de[j] });
      i = fim - 1;
    }
    return achados;
  }

  function medirFigura(src) {
    return new Promise((ok) => {
      if (!src) return ok(null);
      const im = new Image();
      im.onload = () => ok({ largura: im.naturalWidth, altura: im.naturalHeight });
      im.onerror = () => ok(null);
      im.src = src;
    });
  }

  async function revisar(dados) {
    const sinais = [];
    const campos = (dados.campos || []).filter(Boolean);
    const vazios = campos.filter((c) => c.obrigatorio && !String(c.texto || "").trim()).map((c) => c.rotulo);
    if (vazios.length) sinais.push({ nivel: "atencao", texto: `Ainda não preenchido: ${vazios.join(", ")}.` });
    for (const d of duplicados(campos.filter((c) => c.corpo))) {
      sinais.push({ nivel: "importante", texto: `Trecho de ${d.palavras} palavras aparece duas vezes (${d.original === d.em ? d.em : `${d.original} e ${d.em}`}). Pode ter sido colado em dobro.` });
    }
    if (dados.totalPalavras) {
      const total = campos.filter((c) => c.corpo).reduce((s, c) => s + palavrasDe(c.texto).length, 0);
      const [min, max] = dados.totalPalavras;
      if (total && (total < min || total > max)) sinais.push({ nivel: "info", texto: `O texto tem ${total} palavras; a extensão sugerida é de ${min} a ${max}. No painel ele aparece inteiro, com rolagem se precisar.` });
    }
    const objetivo = campos.find((c) => c.vitrine);
    if (objetivo && String(objetivo.texto || "").length > 400) {
      sinais.push({ nivel: "info", texto: `${objetivo.rotulo} tem ${objetivo.texto.length} caracteres e aparece em destaque na vitrine do painel. Acima de ~400, a vitrine passa a rolar.` });
    }
    const figs = dados.figuras || [];
    const medidas = await Promise.all(figs.map((f) => medirFigura(f.src)));
    figs.forEach((f, i) => {
      const n = i + 1, m = medidas[i];
      if (!f.src) { sinais.push({ nivel: "importante", texto: `Figura ${n}: imagem não anexada.` }); return; }
      if (!m) sinais.push({ nivel: "importante", texto: `Figura ${n}: a imagem não abriu.` });
      else if (m.largura < 600) sinais.push({ nivel: "importante", texto: `Figura ${n}: ${m.largura} px de largura. No painel de 55" ela aparece pequena e perde definição ao ser ampliada; envie uma versão maior (1200 px ou mais).` });
      else if (m.largura < 1000) sinais.push({ nivel: "atencao", texto: `Figura ${n}: ${m.largura} px de largura. Legível no painel, mas perde nitidez; o ideal é 1200 px ou mais.` });
      if (!String(f.titulo || "").trim()) sinais.push({ nivel: "atencao", texto: `Figura ${n}: sem título.` });
      if (!String(f.legenda || "").trim()) sinais.push({ nivel: "atencao", texto: `Figura ${n}: sem legenda ou fonte.` });
    });
    return sinais;
  }

  /* Monta a entrada a partir de um trabalho, seja do formulário (intro…)
     ou do backend (introducao…). figuras: [{ src, titulo, legenda }]. */
  function dadosDoTrabalho(t, figuras) {
    const fase8 = Number(t.fase) === 8;
    if (fase8) {
      return { campos: [{ rotulo: "Resumo", texto: t.resumo_completo || t.resumo || "", obrigatorio: true, corpo: true }], figuras: [], totalPalavras: null };
    }
    const valor = (k) => (k === "intro" ? (t.intro != null ? t.intro : t.introducao) : t[k]) || "";
    const secoes = window.SAM_ESQUEMA.camposTexto(t.desenho, t.fase).map((s) => ({
      rotulo: s.rotulo, texto: valor(s.chave), obrigatorio: true, corpo: true, vitrine: s.chave === "objetivos",
    }));
    return {
      campos: [
        { rotulo: "Título", texto: t.titulo, obrigatorio: true },
        { rotulo: "Autores", texto: Array.isArray(t.autores) ? t.autores.join(", ") : t.autores, obrigatorio: true },
        ...secoes,
        { rotulo: "Palavras-chave", texto: Array.isArray(t.palavras) ? t.palavras.join(", ") : t.palavras, obrigatorio: true },
        { rotulo: "Referências", texto: t.referencias, obrigatorio: true },
      ],
      figuras: figuras || [],
      totalPalavras: Number(t.fase) === 7 ? [250, 400] : null,
    };
  }

  /* Caixa de avisos (React, sem JSX para servir às duas páginas).
     props: dados (entrada de revisar), titulo, vazio (texto quando não há avisos) */
  const COR = { importante: ["#B3261E", "#FDECEA"], atencao: ["#8A5A00", "#FFF4E0"], info: ["#01285A", "#E5F6FE"] };
  const ROTULO = { importante: "Conferir", atencao: "Atenção", info: "Informação" };
  function Avisos({ dados, titulo, vazio }) {
    const R = window.React;
    const [sinais, setSinais] = R.useState(null);
    const chave = JSON.stringify(dados);
    R.useEffect(() => {
      let vivo = true;
      const id = setTimeout(() => revisar(dados).then((s) => { if (vivo) setSinais(s); }), 400);
      return () => { vivo = false; clearTimeout(id); };
    }, [chave]);
    const h = R.createElement;
    if (!sinais) return null;
    const ordem = ["importante", "atencao", "info"];
    const lista = sinais.slice().sort((a, b) => ordem.indexOf(a.nivel) - ordem.indexOf(b.nivel));
    return h("div", { style: { border: "1px solid #E3EAF2", borderRadius: 12, background: "#fff", padding: "14px 16px", margin: "12px 0" } },
      h("div", { style: { fontSize: 13, fontWeight: 800, color: "#0C1A2B", marginBottom: 4 } }, titulo || "Revisão para o painel"),
      h("div", { style: { fontSize: 12, color: "#5B6B7E", marginBottom: lista.length ? 10 : 0, lineHeight: 1.45 } },
        lista.length ? "Avisos automáticos. Nada no seu texto é alterado; corrija o que achar necessário." : (vazio || "Nenhum aviso.")),
      lista.map((s, i) => h("div", { key: i, style: { display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.45, color: COR[s.nivel][0], background: COR[s.nivel][1], borderRadius: 8, padding: "7px 10px", marginTop: i ? 6 : 0 } },
        h("strong", { style: { flexShrink: 0 } }, ROTULO[s.nivel] + ":"), h("span", null, s.texto))));
  }

  window.SAM_REVISAO = { revisar, duplicados, dadosDoTrabalho, Avisos };
})();
