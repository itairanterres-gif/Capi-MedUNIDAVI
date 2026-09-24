export type Categoria =
  | "POSTURA"
  | "ANAMNESE"
  | "CONDUTAS"
  | "ORIENTAÇÕES ESSENCIAIS";

export type Marcacao = "NR" | "I" | "PA" | "A";

export const LEGENDA: Record<Marcacao, string> = {
  NR: "Não Realizado",
  I: "Inadequado",
  PA: "Parcialmente Adequado",
  A: "Adequado",
};

export type ItemChecklist = {
  id: number;
  categoria: Categoria;
  texto: string;
  /** O que, na transcrição, sustenta uma marcação alta. Não vai para o interno. */
  observavel: string;
};

/** Os mesmos 12 itens da estação presencial, com a observação reescrita
 *  para o que a modalidade virtual efetivamente captura: texto. */
export const CHECKLIST: ItemChecklist[] = [
  {
    id: 1,
    categoria: "POSTURA",
    texto:
      "Estabelece vínculo e identifica a principal preocupação da paciente (o medo em relação ao rim) antes de avançar para a conduta",
    observavel:
      "Marcador verbal: o interno nomeia o medo antes de prescrever e a paciente verbaliza alívio ('ai, fico mais tranquila'). Perguntar abertamente o motivo da tensão conta a favor.",
  },
  {
    id: 2,
    categoria: "POSTURA",
    texto:
      "Utiliza comunicação compreensível (sem jargão não explicado) e busca decisão compartilhada, não apenas informativa",
    observavel:
      "Marcador verbal: siglas e termos técnicos são explicados quando usados; o interno checa entendimento e pergunta a opinião da paciente. Marcador negativo: a paciente diz que não entendeu ou aceita sem entender.",
  },
  {
    id: 3,
    categoria: "ANAMNESE",
    texto:
      "Reconhece o significado da TFGe e da albuminúria persistentes (doença renal do diabetes já estabelecida, não um achado isolado)",
    observavel:
      "Cita a queda da TFGe e a albuminúria em duas medidas separadas por 4 meses, ou nomeia a doença renal do diabetes/estágio.",
  },
  {
    id: 4,
    categoria: "ANAMNESE",
    texto:
      "Identifica o risco cardiovascular aumentado no contexto global da paciente (HAS + estratificador renal), e não apenas pela HbA1c",
    observavel:
      "Relaciona hipertensão, rim e lípides ao risco cardiovascular. Marcador negativo: raciocínio restrito à HbA1c.",
  },
  {
    id: 5,
    categoria: "CONDUTAS",
    texto:
      "Prioriza terapia com benefício cardiorrenal comprovado e disponível no SUS (classe iSGLT2), não apenas a intensificação glicêmica — não é exigido citar molécula ou nome comercial, o observável é o raciocínio",
    observavel:
      "Propõe a classe iSGLT2 justificando proteção renal e cardiovascular. Citar apenas 'melhorar a glicose' não cumpre o item.",
  },
  {
    id: 6,
    categoria: "CONDUTAS",
    texto:
      "Mantém ou ajusta o tratamento glicêmico considerando a função renal atual",
    observavel:
      "Mantém a metformina reconhecendo a TFGe de 46 e sinaliza o limite: abaixo de 45 mL/min/1,73 m², no máximo 1 g/dia.",
  },
  {
    id: 7,
    categoria: "CONDUTAS",
    texto:
      "Identifica a necessidade de intensificar a prevenção cardiovascular (meta de LDL < 70 mg/dL com estatina de alta potência; controle pressórico)",
    observavel:
      "Propõe estatina de alta potência com meta de LDL < 70 mg/dL e aborda a PA de 148/92 mmHg, mantendo o BRA já em dose máxima.",
  },
  {
    id: 8,
    categoria: "CONDUTAS",
    texto:
      "Identifica a via de acesso gratuito ao iSGLT2 no SUS (PCDT de DRC/CEAF) e orienta a paciente sobre documentação e local de retirada, construindo um plano factível",
    observavel:
      "Diz que o remédio é gratuito por um protocolo do SUS para doença renal crônica, que a retirada é na farmácia do componente especializado (não na UBS) e que há documentação a preencher (laudo/LME, termo, receita), em linguagem que a paciente entenda.",
  },
  {
    id: 9,
    categoria: "CONDUTAS",
    texto:
      "Organiza a monitorização e a reavaliação após a mudança terapêutica (quando e o que reavaliar)",
    observavel:
      "Define retorno e quais exames repetir (função renal, albuminúria, lípides, HbA1c) com algum prazo.",
  },
  {
    id: 10,
    categoria: "ORIENTAÇÕES ESSENCIAIS",
    texto:
      "Explica que o ajuste do tratamento visa também proteção cardiovascular e renal, e não apenas o controle glicêmico",
    observavel:
      "Marcador verbal: a paciente responde 'ah, então não é só pelo açúcar'.",
  },
  {
    id: 11,
    categoria: "ORIENTAÇÕES ESSENCIAIS",
    texto:
      "Aborda adequadamente o medo de progressão renal e de diálise, com informação correta e sem alarmismo",
    observavel:
      "Marcador verbal: responde à pergunta da diálise com informação correta e a paciente verbaliza alívio. Marcador negativo: a paciente recobra o assunto mais de uma vez.",
  },
  {
    id: 12,
    categoria: "ORIENTAÇÕES ESSENCIAIS",
    texto:
      "Apresenta à paciente um plano final coerente e compreensível (síntese da consulta)",
    observavel:
      "Fecha a consulta recapitulando o que muda, por quê e o que ela precisa fazer.",
  },
];

export const CATEGORIAS: Categoria[] = [
  "POSTURA",
  "ANAMNESE",
  "CONDUTAS",
  "ORIENTAÇÕES ESSENCIAIS",
];

export type MarcacaoItem = {
  id: number;
  marcacao: Marcacao;
  evidencia: string;
};

export const SEM_EVIDENCIA = "sem evidência na transcrição";
