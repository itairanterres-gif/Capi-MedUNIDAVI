import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente da API da Anthropic. Este módulo só pode ser importado por
 * código de servidor (rotas em app/api). A chave nunca é exposta ao
 * navegador: não existe NEXT_PUBLIC_ANTHROPIC_API_KEY neste projeto.
 */

export const MODELO = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export const MAX_TOKENS_PACIENTE = Number(
  process.env.MAX_TOKENS_PACIENTE ?? 400,
);
export const MAX_TOKENS_AVALIADOR = Number(
  process.env.MAX_TOKENS_AVALIADOR ?? 2000,
);

let cliente: Anthropic | null = null;

export function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada no servidor. Veja o README.",
    );
  }
  if (!cliente) cliente = new Anthropic({ apiKey });
  return cliente;
}

export type Turno = { role: "user" | "assistant"; content: string };

export type RespostaModelo = {
  texto: string;
  tokensEntrada: number;
  tokensSaida: number;
  duracaoMs: number;
};

export async function conversar(opcoes: {
  system: string;
  messages: Turno[];
  maxTokens: number;
  temperature?: number;
}): Promise<RespostaModelo> {
  const inicio = Date.now();
  const r = await anthropic().messages.create({
    model: MODELO,
    max_tokens: opcoes.maxTokens,
    temperature: opcoes.temperature ?? 0.7,
    system: opcoes.system,
    messages: opcoes.messages,
  });
  const texto = r.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return {
    texto,
    tokensEntrada: r.usage.input_tokens,
    tokensSaida: r.usage.output_tokens,
    duracaoMs: Date.now() - inicio,
  };
}
