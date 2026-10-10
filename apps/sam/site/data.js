/* ============================================================
   SAM — DADOS DA EDIÇÃO ATUAL.
   · PROGRAMA: cronograma oficial, vindo do banco (sam_programa).
     Cada item (oral ou pôster) aceita um campo OPCIONAL `id`
     (ex.: id:"T-0012") que liga manualmente ao trabalho liberado,
     vencendo o casamento automático por nome.
   · TRABALHOS: exemplos usados APENAS como fallback de
     desenvolvimento local (ver lib.jsx). Nunca aparecem ao público
     em produção — a lista real vem do backend (curadoria).
   Globais expostos em window para os scripts Babel.
   ============================================================ */

const C = {
  azul: "#023E88", azulEsc: "#01285A",
  ciano: "#00ADEF", cianoClaro: "#E5F6FE",
  tinta: "#0C1A2B", cinza: "#5B6B7E",
  cinzaClaro: "#EEF2F6", papel: "#F7F9FB", ambar: "#B07A18",
};

const AREA_COR = {
  "Educação Médica": "#5B6B7E", "Neurologia": "#6A4C93", "Neurocirurgia": "#5B3A82",
  "Geriatria": "#B07A18", "Psiquiatria": "#7A4D9C", "Medicina de Família e Comunidade": "#D38F00",
  "Ginecologia e Obstetrícia": "#B23A82", "Oncologia": "#2A8A5C", "Otorrinolaringologia": "#0080B7",
  "Endocrinologia": "#C4622D", "Infectologia": "#3D6E1B", "Pediatria": "#00ADEF",
  "Cardiologia": "#A23A1F", "Cirurgia Vascular": "#7A2616",
  "Anestesiologia": "#33658A", "Cirurgia Geral": "#7A4419", "Reumatologia": "#9C3D54",
  "Gastroenterologia": "#946B2D", "Dermatologia": "#2F7E78", "Ortopedia": "#46537A",
};

/* EDIÇÃO ATUAL (viva). As anteriores, inclusive a XI, estão no arquivo
   (*_sam.json). Datas e dias vêm daqui; local confirmado pelo Itairan em 09/10/2026 (o mesmo da XI). */
const EDICAO_ATUAL = {
  id: "xii", romano: "XII", numero: 12,
  nome: "Semana Acadêmica da Medicina UNIDAVI",
  datasTexto: "23 a 27 de novembro de 2026",
  dataInicio: "2026-11-23", dataFim: "2026-11-27",
  local: "Auditório Célio Simão Martignago",
};

const DIAS = ["Seg · 23/11", "Ter · 24/11", "Qua · 25/11", "Qui · 26/11", "Sex · 27/11"];

/* TRABALHOS EXEMPLO — fallback de DESENVOLVIMENTO LOCAL apenas (nunca em produção) */
const TRABALHOS = [
  { id:"EX-01", fase:7, desenho:"Estudo transversal", area:"Ginecologia e Obstetrícia",
    titulo:"Adesão ao rastreamento de câncer de colo uterino em unidades de saúde da família do Alto Vale do Itajaí",
    autores:["A. Discente Exemplo","B. Discente Exemplo"], orientador:"Orientadora Exemplo",
    intro:"O câncer de colo uterino permanece como causa evitável de mortalidade feminina. O rastreamento citopatológico é a principal estratégia de detecção precoce na atenção primária.",
    objetivos:"Estimar a adesão ao rastreamento e identificar fatores associados à não realização do exame.",
    metodos:"Estudo transversal com 380 mulheres de 25–64 anos cadastradas em quatro ESF, por amostragem aleatória.",
    resultados:"Resultados esperados: estimativa de cobertura por faixa etária e identificação de barreiras de acesso.",
    conclusao:"O projeto deve orientar estratégias locais de ampliação da cobertura no território.",
    palavras:["Neoplasias do colo do útero","Atenção primária","Programas de rastreamento"],
    figuras:[ {ordem:1,secao:"Métodos",legenda:"Fluxo de seleção das ESF participantes",principal:false}, {ordem:2,secao:"Resultados",legenda:"Distribuição da amostra por faixa etária e ESF",principal:true} ] },
  { id:"EX-02", fase:7, desenho:"Revisão sistemática", area:"Endocrinologia",
    titulo:"Metformina versus intervenção dietética isolada na progressão do pré-diabetes: revisão sistemática",
    autores:["C. Discente Exemplo"], orientador:"Orientador Exemplo",
    intro:"O pré-diabetes representa janela de oportunidade para prevenção. Há debate sobre a melhor estratégia inicial.",
    objetivos:"Comparar a eficácia da metformina e da intervenção dietética isolada na progressão para diabetes tipo 2.",
    metodos:"Revisão sistemática em MEDLINE, Embase e Cochrane seguindo PRISMA.",
    resultados:"Síntese qualitativa e, se houver homogeneidade, meta-análise dos desfechos.",
    conclusao:"A síntese deve orientar a conduta inicial no pré-diabetes na atenção primária.",
    palavras:["Estado pré-diabético","Metformina","Dieta"],
    figuras:[ {ordem:1,secao:"Métodos",legenda:"Fluxograma PRISMA da seleção dos estudos",principal:true} ] },
  { id:"EX-03", fase:7, desenho:"Estudo ecológico", area:"Infectologia",
    titulo:"Tendência temporal das internações por dengue no Alto Vale do Itajaí, 2015–2024",
    autores:["D. Discente Exemplo"], orientador:"Orientadora Exemplo",
    intro:"A dengue impõe carga crescente aos serviços de saúde. A análise de tendências apoia o planejamento.",
    objetivos:"Descrever a tendência temporal das internações por dengue na microrregião em dez anos.",
    metodos:"Estudo ecológico de séries temporais com dados do SIH/SUS, com regressão de Prais-Winsten.",
    resultados:"Resultados esperados: identificação de tendência e padrão sazonal das internações.",
    conclusao:"Os achados devem subsidiar o cronograma de ações de controle vetorial.",
    palavras:["Dengue","Séries temporais","Hospitalização"],
    figuras:[ {ordem:1,secao:"Resultados",legenda:"Série temporal das internações por mês (2015–2024)",principal:true} ] },
  { id:"EX-04", fase:8, desenho:"Relato de caso", area:"Pediatria",
    titulo:"Apresentação atípica de lúpus eritematoso sistêmico de início juvenil: relato de caso",
    autores:["E. Discente Exemplo","F. Discente Exemplo"], orientador:"Orientador Exemplo",
    intro:"O LES juvenil pode cursar com apresentações inespecíficas, retardando o diagnóstico.",
    objetivos:"Relatar caso de LES juvenil com apresentação atípica e revisar a literatura pertinente.",
    metodos:"Caso de adolescente com febre prolongada, poliartralgia e citopenias. Consentimento obtido.",
    resultados:"A investigação evidenciou critérios diagnósticos de LES, com boa resposta ao tratamento.",
    conclusao:"O reconhecimento de apresentações atípicas reduz o atraso diagnóstico.",
    palavras:["Lúpus eritematoso sistêmico","Adolescente","Diagnóstico tardio"],
    resumo_completo:"Introdução: o lúpus eritematoso sistêmico de início juvenil pode cursar com apresentações inespecíficas, retardando o diagnóstico. Objetivo: relatar caso de LES juvenil com apresentação atípica e revisar a literatura pertinente. Método: relato de caso de adolescente com febre prolongada, poliartralgia e citopenias, com consentimento obtido. Resultados: a investigação evidenciou critérios diagnósticos de LES, com boa resposta ao tratamento instituído. Conclusão: o reconhecimento de apresentações atípicas reduz o atraso diagnóstico e melhora o prognóstico.",
    figuras:[ {ordem:1,secao:"Resultados",legenda:"Linha do tempo clínica e laboratorial do caso",principal:true} ] },
  { id:"EX-05", fase:8, desenho:"Estudo transversal", area:"Psiquiatria",
    titulo:"Sintomas de ansiedade e qualidade do sono entre estudantes de Medicina: estudo transversal",
    autores:["G. Discente Exemplo"], orientador:"Orientadora Exemplo",
    intro:"A formação médica é reconhecida fonte de sofrimento psíquico.",
    objetivos:"Estimar a prevalência de sintomas de ansiedade e sua associação com a qualidade do sono.",
    metodos:"Estudo transversal com instrumentos validados (GAD-7 e Pittsburgh) aplicados aos estudantes.",
    resultados:"Prevalência elevada de sintomas ansiosos, com associação significativa à má qualidade do sono.",
    conclusao:"Os achados reforçam a necessidade de programas institucionais de apoio à saúde mental.",
    palavras:["Ansiedade","Sono","Estudantes de medicina"],
    resumo_completo:"Introdução: a formação médica é reconhecida fonte de sofrimento psíquico. Objetivo: estimar a prevalência de sintomas de ansiedade e sua associação com a qualidade do sono entre estudantes de Medicina. Método: estudo transversal com instrumentos validados (GAD-7 e índice de Pittsburgh) aplicados aos estudantes. Resultados: observou-se prevalência elevada de sintomas ansiosos, com associação significativa à má qualidade do sono. Conclusão: os achados reforçam a necessidade de programas institucionais de apoio à saúde mental.",
    figuras:[ {ordem:1,secao:"Resultados",legenda:"Distribuição dos escores de ansiedade (GAD-7)",principal:false}, {ordem:2,secao:"Resultados",legenda:"Associação entre ansiedade e qualidade do sono",principal:true} ] },
  { id:"EX-06", fase:8, desenho:"Estudo de coorte", area:"Cardiologia",
    titulo:"Fatores associados à reinternação em 30 dias após insuficiência cardíaca descompensada",
    autores:["H. Discente Exemplo"], orientador:"Orientador Exemplo",
    intro:"A reinternação precoce por IC é marcador de qualidade assistencial e desfecho evitável.",
    objetivos:"Identificar fatores associados à reinternação em 30 dias após internação por IC descompensada.",
    metodos:"Coorte retrospectiva de pacientes internados por IC, com seguimento de 30 dias.",
    resultados:"Fatores como classe funcional avançada e ausência de conciliação medicamentosa associaram-se a maior risco.",
    conclusao:"Intervenções na transição de cuidado podem reduzir reinternações precoces.",
    palavras:["Insuficiência cardíaca","Readmissão","Transição de cuidado"],
    resumo_completo:"Introdução: a reinternação precoce por insuficiência cardíaca é marcador de qualidade assistencial e desfecho evitável. Objetivo: identificar fatores associados à reinternação em 30 dias após internação por IC descompensada. Método: coorte retrospectiva de pacientes internados por IC, com seguimento de 30 dias. Resultados: fatores como classe funcional avançada e ausência de conciliação medicamentosa associaram-se a maior risco. Conclusão: intervenções na transição de cuidado podem reduzir reinternações precoces.",
    figuras:[ {ordem:1,secao:"Resultados",legenda:"Curva de risco de reinternação em 30 dias",principal:true} ] },
];

/* PROGRAMA da edição atual. Começa vazio e é preenchido do banco
   (sam_programa) antes da tela abrir — ver carregarPrograma em sam-backend.js.
   Item oral:   { tc, hora, area, ap, titulo, uc, id? }
   Item pôster: { n, ap, area, titulo, id? }
   Por dia, opcionais: sci (horário da sessão científica), abertura, youtube. */
const PROGRAMA = {};
DIAS.forEach((d) => { PROGRAMA[d] = { orais: [], posteres: [] }; });
/* Horários do dia (cronograma de 30/09/2026): Science with coffee (exposição dos
   pôsteres) e, na segunda-feira, a abertura. Podem mudar até o evento. */
PROGRAMA["Seg · 23/11"].sci = "16h45–17h45"; PROGRAMA["Seg · 23/11"].abertura = { hora:"17h45–18h00", label:"Abertura da XII SAM" };
PROGRAMA["Ter · 24/11"].sci = "17h00–18h00";
PROGRAMA["Qua · 25/11"].sci = "16h20–17h20";
PROGRAMA["Qui · 26/11"].sci = "16h20–17h20";
PROGRAMA["Sex · 27/11"].sci = "16h20–17h20";

/* trabalhoById: resolve nos EXEMPLOS — uso interno/dev. As telas públicas
   resolvem na lista real via useTrabalhos()/trabalhoNaLista (lib.jsx). */
const trabalhoById = (id) => TRABALHOS.find((t) => t.id === id);
const go = (h) => { window.location.hash = h; };

Object.assign(window, { C, AREA_COR, EDICAO_ATUAL, DIAS, TRABALHOS, PROGRAMA, trabalhoById, go });
