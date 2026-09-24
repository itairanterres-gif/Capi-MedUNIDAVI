import { CHECKLIST, MarcacaoItem, SEM_EVIDENCIA } from "./checklist";
import { LEITURA_ESPERADA } from "./caso";

export const CABECALHO_FEEDBACK =
  "Pré-marcação para revisão docente — não é nota";

/**
 * Prompt do avaliador. É uma CHAMADA SEPARADA, com papel separado: este
 * prompt nunca é misturado ao da paciente, e a paciente nunca avalia.
 * A saída é uma pré-marcação para o preceptor revisar — nunca uma nota.
 */
export function promptAvaliador(): string {
  const itens = CHECKLIST.map(
    (i) => `${i.id}. [${i.categoria}] ${i.texto}\n   Observável: ${i.observavel}`,
  ).join("\n");

  return `Você analisa a transcrição de uma consulta simulada entre um interno de medicina e uma paciente virtual. Seu produto é uma PRÉ-MARCAÇÃO de checklist para um preceptor humano revisar. Você não atribui nota, não aprova, não reprova e não escreve conselhos ao interno.

REGRA CENTRAL: toda marcação precisa ser sustentada por um trecho LITERAL da transcrição, copiado sem alterar uma palavra. Quando não houver trecho que sustente a marcação, escreva exatamente "${SEM_EVIDENCIA}" no campo de evidência e marque NR. Nunca parafraseie e apresente como citação. Nunca invente trecho.

ESCALA
- NR (Não Realizado): não há nada na transcrição sobre o item.
- I (Inadequado): o interno abordou o item, mas de forma incorreta.
- PA (Parcialmente Adequado): abordou de forma incompleta ou superficial.
- A (Adequado): cumpriu o item conforme o observável descrito.

REFERÊNCIA CLÍNICA DO CASO (não use nada fora disto)
- ${LEITURA_ESPERADA.estadiamento}
- ${LEITURA_ESPERADA.risco}
- Conduta esperada: ${LEITURA_ESPERADA.conduta.join(" ")}
- Acesso no SUS: ${LEITURA_ESPERADA.acessoSUS}

ITENS
${itens}

SAÍDA
Responda SOMENTE com um objeto JSON, sem texto antes ou depois, no formato:
{"itens":[{"id":1,"marcacao":"NR|I|PA|A","evidencia":"trecho literal da transcrição ou ${SEM_EVIDENCIA}"}]}
Inclua os 12 itens, na ordem, uma única vez cada.`;
}

/** Extrai o JSON da resposta mesmo que venha com cerca de código em volta. */
export function lerMarcacoes(bruto: string): MarcacaoItem[] {
  const semCerca = bruto.replace(/```(?:json)?/gi, "");
  const inicio = semCerca.indexOf("{");
  const fim = semCerca.lastIndexOf("}");
  if (inicio === -1 || fim === -1) {
    throw new Error("Resposta do avaliador sem JSON reconhecível.");
  }
  const dados = JSON.parse(semCerca.slice(inicio, fim + 1)) as {
    itens?: MarcacaoItem[];
  };
  const recebidos = new Map((dados.itens ?? []).map((i) => [Number(i.id), i]));
  return CHECKLIST.map((item) => {
    const r = recebidos.get(item.id);
    const marcacao = r?.marcacao;
    const valida =
      marcacao === "NR" || marcacao === "I" || marcacao === "PA" || marcacao === "A";
    return {
      id: item.id,
      marcacao: valida ? marcacao : "NR",
      evidencia: r?.evidencia?.trim() || SEM_EVIDENCIA,
    };
  });
}

/**
 * Verificação local: uma evidência que não é literal, ou que não é a
 * declaração de ausência, é sinalizada para o preceptor. A IA erra; o
 * docente precisa saber onde.
 */
export function evidenciaConfere(
  evidencia: string,
  transcricao: string,
): boolean {
  const e = evidencia.trim();
  if (!e || e.toLowerCase() === SEM_EVIDENCIA) return true;
  const normalizar = (s: string) =>
    s
      .toLowerCase()
      .replace(/[“”"'’‘]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  return normalizar(transcricao).includes(normalizar(e).slice(0, 60));
}
