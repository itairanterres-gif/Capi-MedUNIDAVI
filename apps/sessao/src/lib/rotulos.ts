// Rótulos legíveis para os slugs institucionais. Os slugs
// (med_unidavi_fXX_ucYY_..., med_unidavi_fXX_ucYY_spZZ) são a chave técnica;
// o docente precisa ver o nome da UC e o título da SP.
//
// FONTE: Manuais Docentes 2026/2 (Google Drive, compartilhados por
// revisão editorial em 24/07/2026):
//   4ª fase — "Manual Docente 4ª fase 2026_2.docx.pdf"
//   5ª fase — "Manual Docente 5ª Fase 2026_2.docx.pdf"
//   6ª fase — "Manual Docente 6ª fase 2026_2.docx.pdf"
// Os três foram lidos integralmente e a estrutura UC/SP abaixo foi conferida
// no sumário E no corpo de cada documento. Onde sumário e corpo divergiam em
// grafia, adotou-se a forma do corpo (ver docs/producao-handoff.md).
//
// Esta tabela é o que valida `sp_referencia`: a numeração de SP das questões
// é derivada da proveniência dos documentos de origem e bate com a numeração
// oficial aqui (ver a checagem registrada no handoff).

const NOMES_UC: Record<string, string> = {
  med_unidavi_f04_uc01_proliferacao_celular: 'Proliferação Celular',
  med_unidavi_f04_uc02_saude_mulher_sexualidade_planejamento_familiar:
    'Saúde da Mulher, Sexualidade Humana e Planejamento Familiar',
  med_unidavi_f04_uc03_doencas_agressao_meio_ambiente:
    'Doenças Resultantes da Agressão ao Meio Ambiente',
  med_unidavi_f05_uc01_dor: 'Dor',
  med_unidavi_f05_uc02_dor_abdominal_diarreia_vomitos_ictericia:
    'Dor Abdominal, Diarreia, Vômitos e Icterícia',
  med_unidavi_f05_uc03_febre_inflamacao_infeccao: 'Febre, Inflamação e Infecção',
  med_unidavi_f06_uc01_problemas_mentais_comportamento: 'Problemas Mentais e de Comportamento',
  med_unidavi_f06_uc02_perda_sangue: 'Perda de Sangue',
  // o manual alterna "Anemia" (sumário/abertura) e "Anemias" (ementas);
  // mantida a forma plural, que é a usada no slug e nos documentos do projeto.
  med_unidavi_f06_uc03_fadiga_perda_peso_anemias: 'Fadiga, Perda de Peso e Anemias',
}

// Títulos oficiais das Situações-Problema (41 no total nas três fases).
// ATENÇÃO: `med_unidavi_f04_uc02_sp05` ("Gravidez sob pressão") existe no
// manual mas ainda NÃO tem questões no banco — é a única lacuna de cobertura.
const TITULOS_SP: Record<string, string> = {
  // ---- 4ª fase ----
  med_unidavi_f04_uc01_sp01: 'O que eu fiz de errado?',
  med_unidavi_f04_uc01_sp02: 'Quando o tempo é decisivo…',
  med_unidavi_f04_uc01_sp03: 'Entre o que dizem os números e o que as pessoas sentem',
  med_unidavi_f04_uc01_sp04: 'Morre Preta Gil aos 50 anos',
  med_unidavi_f04_uc02_sp01: 'Amigo é coisa para se guardar do lado esquerdo do peito',
  med_unidavi_f04_uc02_sp02: 'O corpo muda sem avisar…',
  med_unidavi_f04_uc02_sp03: 'Ainda não está na hora',
  med_unidavi_f04_uc02_sp04: 'Chegou a hora!',
  med_unidavi_f04_uc02_sp05: 'Gravidez sob pressão',
  med_unidavi_f04_uc03_sp01: 'O perigo mora ao lado',
  med_unidavi_f04_uc03_sp02: 'Cuidar do ambiente é cuidar do corpo e da mente',
  med_unidavi_f04_uc03_sp03: 'Educação e Saúde',
  med_unidavi_f04_uc03_sp04: 'A terra onde piso',
  // ---- 5ª fase ----
  med_unidavi_f05_uc01_sp01: 'O que dói mais?',
  med_unidavi_f05_uc01_sp02: 'Que dor é essa?',
  med_unidavi_f05_uc01_sp03: 'É verdade. A dor é real',
  med_unidavi_f05_uc01_sp04: 'Pedras no caminho!',
  med_unidavi_f05_uc02_sp01: 'Muito constrangedor',
  med_unidavi_f05_uc02_sp02: 'É uma inflamação ou uma infecção?',
  med_unidavi_f05_uc02_sp03: 'Álcool: inimigo número 1',
  med_unidavi_f05_uc02_sp04: 'Qual a diferença?',
  med_unidavi_f05_uc02_sp05: 'Medicina e estilo de vida',
  med_unidavi_f05_uc03_sp01: 'Tem o momento certo?',
  med_unidavi_f05_uc03_sp02: 'Sinais de alerta',
  med_unidavi_f05_uc03_sp03: 'Criança doente',
  med_unidavi_f05_uc03_sp04: 'Pé na estrada',
  med_unidavi_f05_uc03_sp05: 'Sexo, Drogas e Música Eletrônica',
  // ---- 6ª fase ----
  med_unidavi_f06_uc01_sp01: 'Memórias',
  med_unidavi_f06_uc01_sp02: 'Estou morrendo',
  med_unidavi_f06_uc01_sp03: 'A escolhida',
  med_unidavi_f06_uc01_sp04: 'Extremos',
  med_unidavi_f06_uc02_sp01: 'Se beber…',
  med_unidavi_f06_uc02_sp02: 'Queda? Infarto?',
  med_unidavi_f06_uc02_sp03: 'Uma longa viagem',
  med_unidavi_f06_uc02_sp04: 'Febres tropicais',
  med_unidavi_f06_uc02_sp05: 'Sangue, suor e lágrimas',
  med_unidavi_f06_uc03_sp01: 'Um idoso frágil',
  med_unidavi_f06_uc03_sp02: 'Quem disse que emagrecer é bom?',
  med_unidavi_f06_uc03_sp03: 'Até quando?',
  med_unidavi_f06_uc03_sp04: 'Triste realidade',
  med_unidavi_f06_uc03_sp05: 'O que vem primeiro? A fadiga ou a anemia?',
}

/** Número da UC dentro da fase (uc01 -> 1). 0 se o slug não seguir o padrão. */
export function numeroUC(ucSlug: string): number {
  const m = /_uc(\d+)_/.exec(ucSlug)
  return m ? Number(m[1]) : 0
}

/** Número da SP (…_sp03 -> 3). 0 se não seguir o padrão. */
export function numeroSP(spSlug: string | null): number {
  if (!spSlug) return 0
  const m = /_sp(\d+)$/.exec(spSlug)
  return m ? Number(m[1]) : 0
}

/** "UC1 — Proliferação Celular" */
export function rotuloUC(ucSlug: string): string {
  const n = numeroUC(ucSlug)
  const nome =
    NOMES_UC[ucSlug] ??
    // fallback: última parte do slug, com espaços e inicial maiúscula
    ucSlug
      .replace(/^med_unidavi_f\d+_uc\d+_/, '')
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
  return n ? `UC${n} — ${nome}` : nome
}

/** Forma curta: "SP 3" (ou "sem SP"). Usada nos cartões da lista. */
export function rotuloSP(spSlug: string | null): string {
  const n = numeroSP(spSlug)
  return n ? `SP ${n}` : 'sem SP'
}

/** Título oficial da SP, se conhecido. */
export function tituloSP(spSlug: string | null): string | null {
  return spSlug ? (TITULOS_SP[spSlug] ?? null) : null
}

/** Forma completa: "SP 3 — Educação e Saúde". Usada no seletor. */
export function rotuloSPCompleto(spSlug: string | null): string {
  const curto = rotuloSP(spSlug)
  const titulo = tituloSP(spSlug)
  return titulo ? `${curto} — ${titulo}` : curto
}
