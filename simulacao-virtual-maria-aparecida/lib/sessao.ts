import { EstadoMomentos, ESTADO_INICIAL } from "./persona";

export type Papel = "interno" | "paciente";

export type Fala = {
  papel: Papel;
  texto: string;
  em: number;
};

export type Tentativa = 1 | 2;

export type Custo = {
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  duracaoMs: number;
};

export const CUSTO_ZERO: Custo = {
  chamadas: 0,
  tokensEntrada: 0,
  tokensSaida: 0,
  duracaoMs: 0,
};

export function somarCusto(a: Custo, b: Custo): Custo {
  return {
    chamadas: a.chamadas + b.chamadas,
    tokensEntrada: a.tokensEntrada + b.tokensEntrada,
    tokensSaida: a.tokensSaida + b.tokensSaida,
    duracaoMs: a.duracaoMs + b.duracaoMs,
  };
}

/** Estado por tentativa mantido no servidor. */
export type EstadoServidor = {
  estado: EstadoMomentos;
  custo: Custo;
  criadaEm: number;
};

const memoria = new Map<string, EstadoServidor>();
const TTL_MS = 6 * 60 * 60 * 1000;

function chave(sessaoId: string, tentativa: Tentativa) {
  return `${sessaoId}#${tentativa}`;
}

export function obterEstado(
  sessaoId: string,
  tentativa: Tentativa,
): EstadoServidor {
  limpar();
  const k = chave(sessaoId, tentativa);
  const atual = memoria.get(k);
  if (atual) return atual;
  const novo: EstadoServidor = {
    estado: { ...ESTADO_INICIAL },
    custo: { ...CUSTO_ZERO },
    criadaEm: Date.now(),
  };
  memoria.set(k, novo);
  return novo;
}

export function gravarEstado(
  sessaoId: string,
  tentativa: Tentativa,
  valor: EstadoServidor,
): void {
  memoria.set(chave(sessaoId, tentativa), valor);
}

function limpar() {
  const agora = Date.now();
  for (const [k, v] of memoria) {
    if (agora - v.criadaEm > TTL_MS) memoria.delete(k);
  }
}

/**
 * Funde o estado que o cliente trouxe com o que o servidor tem. Em
 * ambiente serverless (Vercel) a memória do processo pode ser perdida
 * entre requisições; a fusão mantém a coerência do arco sem tornar o
 * cliente a fonte da verdade — um momento já disparado nunca "desdispara".
 */
export function fundirEstado(
  servidor: EstadoMomentos,
  cliente?: Partial<EstadoMomentos>,
): EstadoMomentos {
  if (!cliente) return servidor;
  return {
    m1Disparado: servidor.m1Disparado || !!cliente.m1Disparado,
    m1Acolhido: servidor.m1Acolhido || !!cliente.m1Acolhido,
    m1Recobrancas: Math.max(servidor.m1Recobrancas, cliente.m1Recobrancas ?? 0),
    m2Disparado: servidor.m2Disparado || !!cliente.m2Disparado,
    m2Compreendido: servidor.m2Compreendido || !!cliente.m2Compreendido,
    m3Disparado: servidor.m3Disparado || !!cliente.m3Disparado,
    m3Resolvido: servidor.m3Resolvido || !!cliente.m3Resolvido,
    encerrando: servidor.encerrando || !!cliente.encerrando,
  };
}

export const DURACAO_CONSULTA_S = 15 * 60;
export const DURACAO_SEGUNDA_TENTATIVA_S = 5 * 60;

export type FalhaTecnica = {
  em: number;
  descricao: string;
};
