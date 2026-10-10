/* ============================================================
   SAM · PAINEL TOUCH 55" (protótipo)
   Galeria → Vitrine do pôster → Leitura completa → Figura ampliada.

   REGRA INEGOCIÁVEL: o texto do aluno é exibido EXATAMENTE como foi
   submetido. Todo texto do trabalho entra por textContent, sem
   resumo, corte, reescrita ou fonte que encolhe. Quando não cabe,
   a tela rola. Cada nó com texto do aluno leva data-campo, e
   verificar.mjs compara o que aparece na tela com o JSON de origem.
   ============================================================ */
(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const DADOS = params.get("dados") || "../site/xi_sam.json";
  const BASE_IMG = params.get("imagens") || "../site/";
  const OCIOSO_MS = 120000; // sem toque por 2 min → volta à galeria

  const AREA_COR = {
    "Educação Médica": "#5B6B7E", "Neurologia": "#6A4C93", "Neurocirurgia": "#5B3A82",
    "Geriatria": "#B07A18", "Psiquiatria": "#7A4D9C", "Medicina de Família e Comunidade": "#D38F00",
    "Ginecologia e Obstetrícia": "#B23A82", "Oncologia": "#2A8A5C", "Otorrinolaringologia": "#0080B7",
    "Endocrinologia": "#C4622D", "Infectologia": "#3D6E1B", "Pediatria": "#00ADEF",
    "Cardiologia": "#A23A1F", "Cirurgia Vascular": "#7A2616",
    "Anestesiologia": "#33658A", "Cirurgia Geral": "#7A4419", "Reumatologia": "#9C3D54",
    "Gastroenterologia": "#946B2D", "Dermatologia": "#2F7E78", "Ortopedia": "#46537A",
  };
  const cor = (a) => AREA_COR[a] || "#5B6B7E";

  /* Mesmo esquema de site/esquema.js: 7ª fase usa sempre a estrutura de
     projeto. `sec` = valor de figura.secao que se ancora naquela seção. */
  const SECOES = {
    padrao: [
      { rotulo: "Introdução", chave: "introducao", sec: "Introdução" },
      { rotulo: "Objetivo", chave: "objetivos", sec: null },
      { rotulo: "Metodologia", chave: "metodos", sec: "Métodos" },
      { rotulo: "Resultados esperados", chave: "resultados", sec: "Resultados" },
    ],
    relato: [
      { rotulo: "Introdução", chave: "introducao", sec: "Introdução" },
      { rotulo: "Apresentação do caso", chave: "metodos", sec: "Métodos" },
      { rotulo: "Discussão", chave: "resultados", sec: "Resultados" },
      { rotulo: "Conclusões", chave: "conclusao", sec: "Discussão" },
    ],
  };
  const ehProjeto = (t) => Number(t.fase) === 7 || !/relato de caso/i.test(t.desenho || "");

  /* A partir da XII cada seção vem no seu próprio campo (introducao,
     objetivos…), como o formulário de submissão grava. No arquivo do XI
     as seções chegaram unidas por linha em branco em `resumo`: só
     separamos quando há exatamente uma parte por seção; senão o texto
     aparece inteiro, num bloco único. Em nenhum caso um caractere é
     acrescentado ou retirado. */
  function secoesDe(t) {
    const esq = ehProjeto(t) ? SECOES.padrao : SECOES.relato;
    if (esq.some((s) => t[s.chave] != null)) {
      return { ok: true, lista: esq.map((s) => ({ ...s, texto: t[s.chave] || "" })) };
    }
    const texto = t.resumo || "";
    const partes = texto.split("\n\n");
    if (partes.length === esq.length) {
      return { ok: true, lista: esq.map((s, i) => ({ ...s, texto: partes[i] })) };
    }
    return { ok: false, lista: [{ rotulo: "Texto do trabalho", sec: null, texto }] };
  }

  /* ---------- utilidades de DOM (texto sempre por textContent) ---------- */
  function el(tag, attrs, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat(Infinity)) if (f != null && f !== false) n.append(f instanceof Node ? f : document.createTextNode(String(f)));
    return n;
  }
  /* texto do aluno: nó próprio, marcado para a verificação */
  const doAluno = (tag, campo, texto, attrs) => { const n = el(tag, { ...(attrs || {}), "data-campo": campo }); n.textContent = texto; return n; };
  const img = (f) => BASE_IMG + f.url;
  const figs = (t) => (t.figuras || []).slice().sort((a, b) => a.ordem - b.ordem);
  const principal = (t) => figs(t).find((f) => f.principal) || figs(t)[0] || null;
  const autores = (t) => (Array.isArray(t.autores) && t.autores.length ? t.autores : [t.autor].filter(Boolean));

  /* ---------- palco: 1080×1920, reduzido para caber fora do painel ---------- */
  const palco = document.getElementById("palco");
  function escala() {
    const s = params.get("real") ? 1 : Math.min(innerWidth / 1080, innerHeight / 1920);
    palco.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener("resize", escala); escala();

  let TRABALHOS = [], filtro = null;
  const scrollGaleria = { y: 0 };

  /* ---------- telas ---------- */
  function galeria() {
    const areas = [...new Set(TRABALHOS.map((t) => t.area))].sort((a, b) => a.localeCompare(b, "pt"));
    const lista = TRABALHOS.filter((t) => !filtro || t.area === filtro);
    const grade = el("div", { class: "grade" }, lista.map((t) => {
      const p = principal(t);
      return el("button", { class: "cartao", onclick: () => ir(`#/p/${t.id}`) },
        el("div", { class: "mini", style: p ? `background-image:url("${img(p)}")` : "" }),
        el("div", { class: "corpo" },
          el("span", { class: "chip", style: `background:${cor(t.area)}` }, t.area),
          doAluno("div", "titulo", t.titulo, { class: "tit" }),
          doAluno("div", "autor", t.autor, { class: "aut" })));
    }));
    const rola = el("div", { class: "rola", style: "flex:1" }, grade);
    const tela = el("div", { class: "tela" },
      el("div", { class: "topo" }, el("div", { class: "marca" }, "XI SAM · Medicina UNIDAVI"),
        el("h1", {}, "Pôsteres"), el("div", { style: "font-size:22px;margin-top:8px;opacity:.85" }, `${lista.length} trabalhos · toque em um pôster para abrir`)),
      el("div", { class: "filtros" },
        el("button", { class: filtro ? "" : "ativo", onclick: () => { filtro = null; scrollGaleria.y = 0; render(); } }, "Todas as áreas"),
        areas.map((a) => el("button", { class: filtro === a ? "ativo" : "", onclick: () => { filtro = a; scrollGaleria.y = 0; render(); } }, a))),
      rola);
    requestAnimationFrame(() => { rola.scrollTop = scrollGaleria.y; });
    rola.addEventListener("scroll", () => { scrollGaleria.y = rola.scrollTop; });
    return tela;
  }

  function barra(t, voltarPara, rotuloVoltar) {
    return el("div", { class: "barra" },
      el("button", { class: "voltar", onclick: () => ir(voltarPara) }, "‹ " + rotuloVoltar),
      el("span", { class: "esp" }),
      el("span", { class: "chip", style: `background:${cor(t.area)}` }, t.area),
      el("span", { style: "font-size:20px;opacity:.8" }, t.id));
  }

  function linhaAutores(t) {
    return el("div", { class: "autores" },
      autores(t).map((a, i) => [i ? ", " : "", doAluno("span", `autores:${i}`, a)]),
      t.orientador ? el("span", { class: "orient" }, " · Orientação: ", doAluno("span", "orientador", t.orientador)) : null);
  }

  function vitrine(t) {
    const { ok, lista } = secoesDe(t);
    const p = principal(t);
    const obj = ok ? lista.find((s) => s.rotulo === "Objetivo") : null;
    const nFig = figs(t).length;
    return el("div", { class: "tela" },
      barra(t, "#/", "Todos os pôsteres"),
      el("div", { class: "vitrine rola", "data-vitrine": "" },
        doAluno("h2", "titulo", t.titulo),
        linhaAutores(t),
        t.afiliacao ? doAluno("div", "afiliacao", t.afiliacao, { class: "afil" }) : null,
        p ? el("button", { class: "fig-principal", onclick: () => abrirFig(p) },
          el("div", { class: "img", style: `background-image:url("${img(p)}")`, role: "img", "aria-label": p.titulo || "" }),
          p.titulo ? doAluno("div", `fig:${p.ordem}:titulo`, p.titulo, { class: "fig-tit" }) : null,
          el("div", { class: "toque" }, "Toque para ampliar")) : null,
        obj ? el("div", { class: "objetivo" }, el("h3", {}, "Objetivo"), doAluno("p", "secao:1", obj.texto)) : null),
      el("div", { class: "acoes" },
        el("button", { class: "prim", onclick: () => ir(`#/p/${t.id}/ler`) }, "Ler o trabalho completo"),
        el("button", { class: "sec", onclick: () => ir(`#/p/${t.id}/ler/figuras`) }, nFig === 1 ? "1 figura" : `${nFig} figuras`)));
  }

  let fonteGrande = false;
  function leitura(t, ancora) {
    const { ok, lista } = secoesDe(t);
    const todas = figs(t);
    const usadas = new Set();
    const figura = (f) => {
      usadas.add(f.ordem);
      return el("figure", { id: `fig-${f.ordem}` },
        el("button", { onclick: () => abrirFig(f), "aria-label": "Ampliar figura" }, el("img", { src: img(f), alt: f.titulo || "", loading: "lazy" })),
        el("figcaption", {},
          f.titulo ? doAluno("div", `fig:${f.ordem}:titulo`, f.titulo, { class: "fig-tit" }) : null,
          f.legenda ? doAluno("div", `fig:${f.ordem}:legenda`, f.legenda, { class: "fig-leg" }) : null));
    };
    const secs = lista.map((s, i) => {
      const daSecao = s.sec ? todas.filter((f) => f.secao === s.sec) : [];
      return el("section", { id: `sec-${i}` },
        el("h3", {}, s.rotulo),
        doAluno("p", ok ? `secao:${i}` : "resumo", s.texto, { class: "txt" }),
        daSecao.map(figura));
    });
    const resto = todas.filter((f) => !usadas.has(f.ordem));
    const pal = Array.isArray(t.palavras) ? t.palavras : [];
    const corpo = el("div", { class: "leitura" + (fonteGrande ? " grande" : "") },
      doAluno("h2", "titulo", t.titulo),
      linhaAutores(t),
      t.afiliacao ? doAluno("p", "afiliacao", t.afiliacao, { class: "afil" }) : null,
      ok ? null : el("p", { class: "aviso-sec" }, "Prévia: as seções deste trabalho não puderam ser separadas automaticamente, então o texto aparece inteiro e sem alteração. Pôster sinalizado para a curadoria."),
      secs,
      resto.length ? el("section", { id: "sec-outras" }, el("h3", {}, "Outras figuras"), resto.map(figura)) : null,
      pal.length ? el("section", {}, el("h3", {}, "Palavras-chave"),
        el("p", { class: "txt pal" }, pal.map((w, i) => [i ? " · " : "", doAluno("span", `palavras:${i}`, w)]))) : null,
      t.referencias ? el("section", { id: "sec-refs" }, el("h3", {}, "Referências"), doAluno("p", "referencias", t.referencias, { class: "refs" })) : null);
    const rola = el("div", { class: "rola", style: "flex:1" }, corpo);
    const pular = (id) => { const alvo = corpo.querySelector("#" + id); if (alvo) rola.scrollTo({ top: alvo.offsetTop - 10, behavior: "smooth" }); };
    const abas = el("div", { class: "abas" },
      lista.map((s, i) => el("button", { onclick: () => pular(`sec-${i}`) }, s.rotulo)),
      todas.length ? el("button", { onclick: () => pular(todas[0] ? `fig-${todas[0].ordem}` : "") }, "Figuras") : null,
      t.referencias ? el("button", { onclick: () => pular("sec-refs") }, "Referências") : null);
    const topo = barra(t, `#/p/${t.id}`, "Voltar ao pôster");
    topo.insertBefore(el("button", { class: "voltar", onclick: () => { fonteGrande = !fonteGrande; corpo.classList.toggle("grande", fonteGrande); } }, "A / A+"), topo.children[1]);
    if (ancora === "figuras" && todas.length) requestAnimationFrame(() => { const a = corpo.querySelector(`#fig-${todas[0].ordem}`); if (a) rola.scrollTop = a.offsetTop - 10; });
    return el("div", { class: "tela" }, topo, abas, rola);
  }

  /* ---------- figura ampliada: pinça, arrasto e toque duplo ---------- */
  const lb = document.getElementById("lightbox"), lbImg = document.getElementById("lb-img"), lbArea = lb.querySelector(".lb-area");
  const z = { s: 1, fit: 1, x: 0, y: 0 };
  const aplica = () => { lbImg.style.transform = `translate(calc(-50% + ${z.x}px), calc(-50% + ${z.y}px)) scale(${z.s})`; };
  const ajustar = () => {
    const r = lbArea.getBoundingClientRect();
    z.fit = Math.min(r.width / (lbImg.naturalWidth || 1), r.height / (lbImg.naturalHeight || 1)) * 0.96;
    z.s = z.fit; z.x = z.y = 0; aplica();
  };
  const zoom = (fator) => { z.s = Math.min(Math.max(z.s * fator, z.fit * 0.8), z.fit * 8); aplica(); };
  function abrirFig(f) {
    lbImg.onload = ajustar; lbImg.src = img(f); lbImg.alt = f.titulo || "";
    const leg = document.getElementById("lb-legenda"); leg.textContent = "";
    if (f.titulo) leg.append(doAluno("div", `fig:${f.ordem}:titulo`, f.titulo, { style: "font-weight:700" }));
    if (f.legenda) leg.append(doAluno("div", `fig:${f.ordem}:legenda`, f.legenda));
    lb.hidden = false; if (lbImg.complete) ajustar();
  }
  lb.querySelector(".lb-botoes").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-fechar")) { lb.hidden = true; return; }
    const d = Number(b.dataset.zoom); if (d === 0) ajustar(); else zoom(d > 0 ? 1.4 : 1 / 1.4);
  });
  const ptrs = new Map(); let pinca = null, ultimoToque = 0;
  lbArea.addEventListener("pointerdown", (e) => {
    lbArea.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      const agora = Date.now();
      if (agora - ultimoToque < 300) { if (z.s > z.fit * 1.05) ajustar(); else { z.s = z.fit * 2.5; aplica(); } }
      ultimoToque = agora;
    }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), s: z.s }; }
  });
  lbArea.addEventListener("pointermove", (e) => {
    const ant = ptrs.get(e.pointerId); if (!ant) return;
    const novo = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, novo);
    if (ptrs.size === 2 && pinca) {
      const [a, b] = [...ptrs.values()];
      z.s = Math.min(Math.max(pinca.s * Math.hypot(a.x - b.x, a.y - b.y) / pinca.d, z.fit * 0.8), z.fit * 8);
    } else if (ptrs.size === 1) { z.x += novo.x - ant.x; z.y += novo.y - ant.y; }
    aplica();
  });
  const solta = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinca = null; };
  lbArea.addEventListener("pointerup", solta); lbArea.addEventListener("pointercancel", solta);
  lbArea.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });

  /* ---------- rotas e ociosidade ---------- */
  function ir(h) { if (location.hash === h) render(); else location.hash = h; }
  function render() {
    lb.hidden = true;
    const [, tipo, id, modo, ancora] = (location.hash || "#/").split("/");
    const t = tipo === "p" ? TRABALHOS.find((x) => x.id === id) : null;
    palco.replaceChildren(!t ? galeria() : modo === "ler" ? leitura(t, ancora) : vitrine(t));
  }
  addEventListener("hashchange", render);
  let ocioso;
  const acorda = () => { clearTimeout(ocioso); ocioso = setTimeout(() => { filtro = null; scrollGaleria.y = 0; ir("#/"); }, OCIOSO_MS); };
  ["pointerdown", "keydown", "wheel"].forEach((ev) => addEventListener(ev, acorda, { passive: true }));

  fetch(DADOS).then((r) => r.json()).then((d) => {
    // Só o que a curadoria liberou chega ao painel.
    TRABALHOS = (d.trabalhos || []).filter((t) => t.camada === "poster_tc1" && (t.statusCuradoria == null || t.statusCuradoria === "publicado"));
    window.SAM_PAINEL = { TRABALHOS, secoesDe }; // usado por verificar.mjs
    render(); acorda();
    document.documentElement.dataset.pronto = "1";
  });
})();
