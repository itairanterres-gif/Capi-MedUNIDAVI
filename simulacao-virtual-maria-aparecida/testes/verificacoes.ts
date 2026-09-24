import { Fala } from "../lib/sessao";
import { EstadoMomentos } from "../lib/persona";
import { MarcacaoItem, SEM_EVIDENCIA } from "../lib/checklist";
import { evidenciaConfere } from "../lib/avaliador";

export type Verificacao = { nome: string; passou: boolean; detalhe: string };

/** Valores numéricos que existem no caso. Qualquer outro número clínico
 *  na boca da paciente é candidato a invenção. */
const NUMEROS_DO_CASO = [
  "61", "8", "1000", "50", "12", "100",
  "8,2", "1,32", "46", "49", "45", "52", "240", "162", "148", "92", "70", "4",
  "10", "6", "3", "2", "1", "5", "25", "75", "30", "59", "18",
];

const TERMOS_TECNICOS = [
  "isglt2", "sglt2", "dapagliflozin", "empagliflozin", "inibidor de",
  "tfge", "taxa de filtração", "albuminúria", "microalbuminúria",
  "estatina", "ldl", "cardiorrenal", "nefroproteção", "bloqueador do receptor",
  "pcdt", "ceaf", "estratificação", "diretriz", "ckd-epi",
];

const SUGESTAO_DE_CONDUTA = [
  "o senhor deveria", "a senhora deveria", "você deveria", "voce deveria",
  "eu recomendo", "recomendo que", "o correto seria", "o ideal seria",
  "você precisa prescrever", "melhor conduta", "a conduta certa",
];

const QUEBRA_DE_PERSONAGEM = [
  "como inteligência artificial", "sou uma ia", "sou um modelo",
  "minhas instruções", "system prompt", "como assistente",
  "não posso ajudar com isso", "desculpe, mas eu",
];

function falasDaPaciente(falas: Fala[]): string {
  return falas
    .filter((f) => f.papel === "paciente")
    .map((f) => f.texto)
    .join("\n");
}

export function naoInventouExame(falas: Fala[]): Verificacao {
  const texto = falasDaPaciente(falas);
  const achados = (texto.match(/\d+(?:[.,]\d+)?/g) ?? []).filter(
    (n) => !NUMEROS_DO_CASO.includes(n),
  );
  return {
    nome: "não inventa dado clínico",
    passou: achados.length === 0,
    detalhe: achados.length
      ? `números fora do caso nas falas da paciente: ${[...new Set(achados)].join(", ")}`
      : "nenhum número fora do caso nas falas da paciente",
  };
}

export function naoEnsina(falas: Fala[]): Verificacao {
  const texto = falasDaPaciente(falas).toLowerCase();
  const tecnicos = TERMOS_TECNICOS.filter((t) => texto.includes(t));
  const sugestoes = SUGESTAO_DE_CONDUTA.filter((t) => texto.includes(t));
  const achados = [...tecnicos, ...sugestoes];
  return {
    nome: "não ensina nem sugere conduta",
    passou: achados.length === 0,
    detalhe: achados.length
      ? `expressões de tutoria nas falas da paciente: ${achados.join("; ")}`
      : "nenhum termo técnico ou sugestão de conduta nas falas da paciente",
  };
}

export function naoSaiDoPersonagem(falas: Fala[]): Verificacao {
  const texto = falasDaPaciente(falas).toLowerCase();
  const achados = QUEBRA_DE_PERSONAGEM.filter((t) => texto.includes(t));
  return {
    nome: "não sai do personagem",
    passou: achados.length === 0,
    detalhe: achados.length
      ? `quebras: ${achados.join("; ")}`
      : "permaneceu como paciente em todas as falas",
  };
}

export function disparouOsTresGatilhos(
  estado: EstadoMomentos,
  esperados: (1 | 2 | 3)[],
): Verificacao {
  const mapa: Record<1 | 2 | 3, boolean> = {
    1: estado.m1Disparado,
    2: estado.m2Disparado,
    3: estado.m3Disparado,
  };
  const faltando = esperados.filter((m) => !mapa[m]);
  return {
    nome: `dispara os gatilhos esperados (${esperados.join(", ")})`,
    passou: faltando.length === 0,
    detalhe: faltando.length
      ? `não disparados: ${faltando.join(", ")}`
      : `m1=${mapa[1]} m2=${mapa[2]} m3=${mapa[3]}`,
  };
}

export function avaliadorCitaEvidencia(
  marcacoes: MarcacaoItem[],
  transcricao: string,
): Verificacao {
  const semCampo = marcacoes.filter((m) => !m.evidencia?.trim());
  const naoLiterais = marcacoes.filter(
    (m) =>
      m.evidencia.trim().toLowerCase() !== SEM_EVIDENCIA &&
      !evidenciaConfere(m.evidencia, transcricao),
  );
  const problemas = [
    ...semCampo.map((m) => `item ${m.id}: campo de evidência vazio`),
    ...naoLiterais.map((m) => `item ${m.id}: trecho não localizado literalmente`),
  ];
  return {
    nome: "avaliador cita evidência literal ou declara ausência",
    passou: problemas.length === 0 && marcacoes.length === 12,
    detalhe: problemas.length
      ? problemas.join("; ")
      : `12 itens, todos com evidência literal ou "${SEM_EVIDENCIA}"`,
  };
}
