/* ============================================================
   SAM · painel touch — dados do banco no formato do painel.
   Entrada: trabalho como o adaptador do SAM entrega (SAM_BACKEND.listarPublicados).
   Saída: o formato que painel.js lê (o mesmo do arquivo da XI, com as seções
   da XII em campos próprios).

   REGRA: nenhum texto do aluno é alterado aqui. Só se renomeiam campos, e
   campo ausente vira texto vazio — nunca texto inventado ou cortado.
   ============================================================ */
(function () {
  "use strict";
  function paraPainel(t) {
    const figuras = (Array.isArray(t.figuras) ? t.figuras : []).map((f) => ({
      ordem: f.ordem, secao: f.secao, titulo: f.titulo || "", legenda: f.legenda || "",
      url: f.url, principal: !!f.principal,
    }));
    return {
      id: t.id, camada: Number(t.fase) === 7 ? "poster_tc1" : "oral_tc2",
      area: t.area || "", titulo: t.titulo || "", autor: t.autor || "",
      autores: Array.isArray(t.autores) ? t.autores : [], orientador: t.orientador || "",
      profUc: t.profUc || "", fase: Number(t.fase), desenho: t.desenho || "", afiliacao: t.afiliacao || "",
      introducao: t.introducao || "", objetivos: t.objetivos || "", metodos: t.metodos || "",
      resultados: t.resultados || "", conclusao: t.conclusao || "",
      resumo: t.resumo_completo || "", palavras: Array.isArray(t.palavras) ? t.palavras : [],
      referencias: t.referencias || "", figuras,
      statusCuradoria: "publicado",       // o banco só entrega os publicados
    };
  }
  const api = { paraPainel };
  if (typeof window !== "undefined") window.SAM_PAINEL_DADOS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
