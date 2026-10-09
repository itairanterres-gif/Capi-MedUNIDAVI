/* ============================================================
   SAM · adaptador de backend
   Modo "appsscript" (padrão, site publicado sozinho) ou "supabase"
   (servido dentro do Capi MedUNIDAVI, com window.SAM_CONFIG).
   No modo supabase, as respostas imitam o formato do Apps Script
   ({ ok, trabalhos, ... }) para que as telas mudem o mínimo.
   Regra: o e-mail do aluno nunca é pedido nem exibido aqui.
   ============================================================ */
(function () {
  "use strict";
  var cfg = window.SAM_CONFIG;
  var modo = cfg && cfg.backend === "supabase" ? "supabase" : "appsscript";
  var cliente = null;

  function sb() {
    if (!cliente) {
      cliente = window.supabase.createClient(cfg.url, cfg.key, {
        // Mesma chave de sessão do Capi: dentro da mesma origem, o login é único.
        auth: { storageKey: cfg.storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
    }
    return cliente;
  }
  function falha(erro) { return { ok: false, erro: (erro && erro.message) || String(erro || "Falha") }; }

  var COLUNAS = [
    "id", "codigo", "apresentador_nome", "fase", "modalidade", "status", "titulo", "desenho", "area",
    "prof_uc", "afiliacao", "introducao", "objetivos", "metodos", "resultados", "conclusao",
    "resumo_completo", "palavras", "referencias", "fig_principal", "foto_autores_path", "ajuste_layout",
    "slides_url", "comentario_curadoria", "atualizado_em",
    "sam_trabalho_autores(nome,papel,ordem)",
    "sam_figuras(ordem,secao,titulo,legenda,storage_path)",
    "sam_materiais(podcast_url,flashcards_url,flashcards_texto,quiz,link_artigo,publicacao)",
  ].join(",");

  function urlArquivo(caminho) {
    if (!caminho) return "";
    if (/^https?:\/\//.test(caminho)) return caminho;
    return cfg.url + "/storage/v1/object/public/sam-figuras/" + caminho;
  }
  function mesmoNome(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }

  /* Linha do banco → objeto no formato que o site já usa (Apps Script/XI). */
  function paraSite(r) {
    var autores = (r.sam_trabalho_autores || []).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    var nomes = autores.filter(function (a) { return a.papel !== "orientador"; }).map(function (a) { return a.nome; });
    if (!nomes.some(function (n) { return mesmoNome(n, r.apresentador_nome); })) nomes.unshift(r.apresentador_nome);
    var orient = autores.filter(function (a) { return a.papel === "orientador"; }).map(function (a) { return a.nome; });
    var principal = Number(r.fig_principal) || 1;
    var figuras = (r.sam_figuras || []).slice().sort(function (a, b) { return a.ordem - b.ordem; }).map(function (f) {
      return { ordem: f.ordem, secao: f.secao, titulo: f.titulo || "", legenda: f.legenda || "", url: urlArquivo(f.storage_path), principal: f.ordem === principal };
    });
    var m = (r.sam_materiais || [])[0] || (r.sam_materiais && !Array.isArray(r.sam_materiais) ? r.sam_materiais : null);
    var material = m && (m.podcast_url || m.quiz || m.flashcards_url || m.flashcards_texto || m.link_artigo || m.publicacao)
      ? { audioUrl: m.podcast_url || "", quiz: m.quiz || null, flashcardsUrl: m.flashcards_url || "", flashcardsText: m.flashcards_texto || "", linkArtigo: m.link_artigo || "", publicacao: m.publicacao || "" }
      : null;
    return {
      id: r.codigo, _uuid: r.id, status: r.status, atualizado_em: r.atualizado_em,
      titulo: r.titulo, fase: r.fase, desenho: r.desenho || "", area: r.area || "",
      autor: r.apresentador_nome, autores: nomes, orientador: orient.join(", "), profUc: r.prof_uc || "",
      afiliacao: r.afiliacao || "", introducao: r.introducao || "", objetivos: r.objetivos || "",
      metodos: r.metodos || "", resultados: r.resultados || "", conclusao: r.conclusao || "",
      resumo_completo: r.resumo_completo || "", palavras: r.palavras || [], referencias: r.referencias || "",
      fig_principal: principal, figuras: figuras, foto_autores_url: urlArquivo(r.foto_autores_path),
      ajuste_layout: r.ajuste_layout ? JSON.stringify(r.ajuste_layout) : "",
      slidesUrl: r.slides_url || "", comentario_curadoria: r.comentario_curadoria || "", material: material,
    };
  }

  /* Formulário do site → lista de autores [{nome, papel}] do banco. */
  function autoresDoFormulario(d) {
    var lista = String(Array.isArray(d.autores) ? d.autores.join(",") : (d.autores || ""))
      .split(/[,;\n]/).map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (nome) { return { nome: nome, papel: "autor" }; });
    String(d.orientador || "").split(/[,;\n]/).map(function (s) { return s.trim(); }).filter(Boolean)
      .forEach(function (nome) { lista.push({ nome: nome, papel: "orientador" }); });
    return lista;
  }

  async function listarPublicados() {
    var r = await sb().from("sam_trabalhos").select(COLUNAS).eq("edicao_id", cfg.edicao).eq("status", "publicado");
    if (r.error) throw r.error;
    return { ok: true, trabalhos: r.data.map(paraSite) };
  }

  async function sessao() {
    var r = await sb().auth.getSession();
    return r.data && r.data.session ? r.data.session : null;
  }
  function urlEntrar() {
    // O login acontece no Capi; ao voltar, a mesma página do SAM é reaberta.
    return "/entrar?next=" + encodeURIComponent(location.pathname + location.hash);
  }

  /* Aluno: o próprio trabalho. Curadores leem todos pelas regras do banco,
     então o vínculo vem de sam_meu_trabalho (e-mail da conta = da matrícula). */
  async function meuTrabalho() {
    if (!(await sessao())) return { ok: false, erro: "login", entrar: urlEntrar() };
    var id = await sb().rpc("sam_meu_trabalho", { e: cfg.edicao });
    if (id.error) return falha(id.error);
    var r = id.data ? await sb().from("sam_trabalhos").select(COLUNAS).eq("id", id.data) : { data: [] };
    if (r.error) return falha(r.error);
    if (!r.data.length) return { ok: false, erro: "Nenhum trabalho vinculado à sua matrícula nesta edição." };
    return { ok: true, trabalho: paraSite(r.data[0]) };
  }
  async function salvarMeuTrabalho(uuid, d) {
    var dados = {
      titulo: d.titulo, desenho: d.desenho, area: d.area, afiliacao: d.afiliacao, profUc: d.profUc,
      introducao: d.introducao, objetivos: d.objetivos, metodos: d.metodos, resultados: d.resultados,
      conclusao: d.conclusao, resumo_completo: d.resumo_completo, referencias: d.referencias,
      palavras: String(Array.isArray(d.palavras) ? d.palavras.join(",") : (d.palavras || "")).split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean),
      fig_principal: d.fig_principal, slidesUrl: d.slidesUrl, autores: autoresDoFormulario(d),
    };
    var r = await sb().rpc("sam_salvar_trabalho", { t: uuid, dados: dados });
    return r.error ? falha(r.error) : { ok: true };
  }

  /* Curadoria. */
  async function curadoriaListar() {
    if (!(await sessao())) return { ok: false, erro: "login", entrar: urlEntrar() };
    var r = await sb().from("sam_trabalhos").select(COLUNAS).eq("edicao_id", cfg.edicao).order("codigo");
    if (r.error) return falha(r.error);
    return { ok: true, trabalhos: r.data.map(paraSite) };
  }
  async function curadoriaDecidir(uuid, status, comentario) {
    var r = await sb().rpc("sam_decidir_curadoria", { t: uuid, decisao: status, comentario: comentario || null });
    return r.error ? falha(r.error) : { ok: true };
  }
  async function curadoriaAjustarLayout(uuid, ajusteTexto) {
    var ajuste = null;
    try { ajuste = ajusteTexto ? JSON.parse(ajusteTexto) : null; } catch (e) { return { ok: false, erro: "Ajuste de layout inválido." }; }
    var r = await sb().rpc("sam_ajustar_layout", { t: uuid, ajuste: ajuste });
    return r.error ? falha(r.error) : { ok: true };
  }
  async function ehCurador() {
    if (!(await sessao())) return false;
    var r = await sb().rpc("sam_eh_curador");
    return !r.error && r.data === true;
  }

  /* Apreciação: visitante anônimo ou conta Capi (aluno/docente). */
  async function apreciar(p) {
    var s = await sessao();
    var tipo = p.tipo_apreciador === "outro" ? "visitante" : p.tipo_apreciador;
    var linha = {
      trabalho_id: p.trabalho_uuid, tipo_apreciador: tipo, tipo_tc: p.tipo_tc,
      respostas: p.respostas || {}, comentario_aberto: p.comentario_aberto || null,
    };
    if (tipo === "visitante") { linha.nome_visitante = String(p.nome_apreciador || "").trim() || null; }
    else {
      if (!s) return { ok: false, erro: "login", entrar: urlEntrar() };
      linha.user_id = s.user.id;
    }
    var r = await sb().from("sam_apreciacoes").insert(linha);
    if (r.error && r.error.code === "23505") return { ok: false, erro: "Você já apreciou este trabalho." };
    if (r.error && r.error.code === "42501") return { ok: false, erro: tipo === "docente"
      ? "A apreciação de docente é exclusiva para contas de docentes no Capi. Escolha a opção de estudante."
      : "Esta apreciação não pôde ser registrada para a sua conta." };
    return r.error ? falha(r.error) : { ok: true };
  }
  async function listarApreciacoes() {
    var r = await sb().from("sam_apreciacoes").select("trabalho_id,tipo_apreciador,tipo_tc,nome_visitante,respostas,comentario_aberto,criado_em,sam_trabalhos(codigo,titulo,fase)").order("criado_em");
    if (r.error) return falha(r.error);
    return { ok: true, apreciacoes: r.data.map(function (a) {
      var t = a.sam_trabalhos || {};
      return { trabalho_id: t.codigo, trabalho_titulo: t.titulo, fase: t.fase, tipo_apreciador: a.tipo_apreciador === "visitante" ? "outro" : a.tipo_apreciador,
               tipo_tc: a.tipo_tc, nome_apreciador: a.nome_visitante || "", respostas: a.respostas, comentario_aberto: a.comentario_aberto || "", criado_em: a.criado_em };
    }) };
  }

  async function sair() { await sb().auth.signOut(); }

  window.SAM_BACKEND = {
    modo: modo,
    listarPublicados: listarPublicados,
    meuTrabalho: meuTrabalho, salvarMeuTrabalho: salvarMeuTrabalho,
    curadoriaListar: curadoriaListar, curadoriaDecidir: curadoriaDecidir, ehCurador: ehCurador,
    curadoriaAjustarLayout: curadoriaAjustarLayout,
    apreciar: apreciar, listarApreciacoes: listarApreciacoes,
    sessao: sessao, urlEntrar: urlEntrar, sair: sair,
    _paraSite: paraSite, _autoresDoFormulario: autoresDoFormulario,
  };
})();
