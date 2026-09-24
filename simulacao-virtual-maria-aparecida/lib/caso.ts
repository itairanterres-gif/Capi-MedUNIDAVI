/**
 * Verdade clínica do caso. Nenhum outro módulo pode inventar dado clínico:
 * tudo o que a paciente virtual sabe, e tudo o que o painel lateral mostra,
 * vem daqui.
 */

export const IDENTIDADE = {
  nome: "Maria Aparecida Souza",
  idade: 61,
  ocupacao: "aposentada (ex-auxiliar de serviços gerais)",
  contexto:
    "Mora com o marido. Uma filha mora perto e ajuda nas idas à unidade de saúde.",
  diagnosticos: "DM2 há 8 anos, hipertensão arterial sistêmica, dislipidemia.",
  motivo:
    "Retorno ambulatorial no SUS após exames de rotina. Chega tensa porque uma vizinha disse que \"quando o rim começa a falhar é porque vai precisar de diálise\".",
} as const;

export type Medicamento = {
  nome: string;
  dose: string;
  posologia: string;
  observacao?: string;
};

export const MEDICACOES: Medicamento[] = [
  {
    nome: "Metformina",
    dose: "1000 mg",
    posologia: "12/12 h",
    observacao: "Em uso há anos. A paciente toma sem falhas.",
  },
  {
    nome: "Losartana",
    dose: "50 mg",
    posologia: "12/12 h",
    observacao: "100 mg/dia — dose máxima da medicação.",
  },
];

export type ResultadoExame = {
  exame: string;
  atual: string;
  anterior?: string;
  referencia?: string;
};

/** Laudo exibido na tela, equivalente à folha impressa da versão presencial. */
export const LAUDO: ResultadoExame[] = [
  { exame: "HbA1c", atual: "8,2 %", referencia: "meta individualizada" },
  { exame: "Creatinina", atual: "1,32 mg/dL" },
  {
    exame: "TFGe (CKD-EPI)",
    atual: "46 mL/min/1,73 m²",
    anterior: "49 mL/min/1,73 m²",
    referencia: "já calculada no laudo",
  },
  {
    exame: "Relação albumina/creatinina urinária (RAC)",
    atual: "45 mg/g",
    anterior: "52 mg/g",
  },
  { exame: "Colesterol total", atual: "240 mg/dL" },
  { exame: "LDL-colesterol", atual: "162 mg/dL" },
  { exame: "Pressão arterial na consulta", atual: "148/92 mmHg" },
];

export const DATA_EXAME_ANTERIOR = "4 meses atrás";

/**
 * Leitura clínica esperada — NÃO é mostrada ao interno em nenhuma tela.
 * Serve ao avaliador e ao preceptor.
 */
export const LEITURA_ESPERADA = {
  estadiamento:
    "Doença renal do diabetes estabelecida, G3a A2 (TFGe 30–59 com RAC persistentemente aumentada em duas medidas separadas por 4 meses).",
  risco:
    "Alto risco cardiovascular (HAS + estratificador renal). Meta de LDL < 70 mg/dL com estatina de alta potência.",
  conduta: [
    "Introduzir iSGLT2 pelo benefício cardiorrenal (a classe é o observável; nome comercial não é exigido).",
    "Manter o BRA (losartana já em dose máxima).",
    "Intensificar a estatina para alta potência, meta de LDL < 70 mg/dL.",
    "Controlar a pressão arterial (148/92 mmHg fora de meta).",
    "Manter a metformina com atenção à TFGe: se cair abaixo de 45 mL/min/1,73 m², reduzir para no máximo 1 g/dia.",
    "Planejar a monitorização: quando e o que reavaliar após a mudança terapêutica.",
  ],
  acessoSUS:
    "Dapagliflozina 10 mg está disponível pelo PCDT de Estratégias para Atenuar a Progressão da Doença Renal Crônica (Portaria Conjunta SAES/SECTICS nº 11/2024). Critérios: TFG entre 25 e 75 mL/min/1,73 m², DM2 e uso de IECA ou BRA — sem exigência de idade nem de sulfonilureia prévia. CID N18.3. Dispensação pelo Componente Especializado da Assistência Farmacêutica (CEAF): LME, laudo, termo de consentimento, receita para 6 meses, renovação semestral e retirada na farmácia do componente especializado — não sai da farmácia da UBS. A prescrição pode ser feita na atenção primária.",
} as const;

/** Texto do laudo como a paciente o vê (ela não interpreta nada disso). */
export function laudoEmTexto(): string {
  const linhas = LAUDO.map((r) =>
    r.anterior
      ? `- ${r.exame}: ${r.atual} (${DATA_EXAME_ANTERIOR}: ${r.anterior})`
      : `- ${r.exame}: ${r.atual}`,
  );
  return linhas.join("\n");
}
