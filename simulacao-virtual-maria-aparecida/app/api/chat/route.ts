import { NextRequest, NextResponse } from "next/server";
import { conversar, MAX_TOKENS_PACIENTE, MODELO } from "@/lib/anthropic";
import {
  EstadoMomentos,
  lerEstado,
  limparFala,
  promptPaciente,
} from "@/lib/persona";
import {
  Fala,
  Tentativa,
  fundirEstado,
  gravarEstado,
  obterEstado,
  somarCusto,
} from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Corpo = {
  sessaoId: string;
  tentativa: Tentativa;
  falas: Fala[];
  segundosRestantes: number;
  momentoRetomado?: 1 | 2 | 3;
  estadoCliente?: Partial<EstadoMomentos>;
  /** Fim do cronômetro: a paciente encerra a cena conforme o roteiro. */
  encerrar?: boolean;
};

const DEIXA_DE_ENCERRAMENTO =
  "[O tempo da consulta terminou. Despeça-se agora, em uma ou duas frases, de forma coerente com o que aconteceu nesta consulta. Se o medo da diálise não tiver sido tratado, retome-o antes de se despedir.]";

export async function POST(req: NextRequest) {
  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const { sessaoId, falas, segundosRestantes } = corpo;
  const tentativa: Tentativa = corpo.tentativa === 2 ? 2 : 1;

  if (!sessaoId || !Array.isArray(falas) || falas.length === 0) {
    return NextResponse.json(
      { erro: "sessaoId e falas são obrigatórios." },
      { status: 400 },
    );
  }

  const guardado = obterEstado(sessaoId, tentativa);
  const estadoAtual = fundirEstado(guardado.estado, corpo.estadoCliente);

  const messages = falas.map((f) => ({
    role: (f.papel === "interno" ? "user" : "assistant") as "user" | "assistant",
    content: f.texto,
  }));

  if (corpo.encerrar) {
    const ultima = messages[messages.length - 1];
    if (ultima?.role === "user") {
      ultima.content = `${ultima.content}\n\n${DEIXA_DE_ENCERRAMENTO}`;
    } else {
      messages.push({ role: "user", content: DEIXA_DE_ENCERRAMENTO });
    }
  }

  if (messages[0]?.role !== "user") {
    return NextResponse.json(
      { erro: "A conversa precisa começar por uma fala do interno." },
      { status: 400 },
    );
  }

  try {
    const r = await conversar({
      system: promptPaciente({
        estado: estadoAtual,
        segundosRestantes: Number(segundosRestantes) || 0,
        momentoRetomado: corpo.momentoRetomado,
      }),
      messages,
      maxTokens: MAX_TOKENS_PACIENTE,
    });

    const estado = lerEstado(r.texto, estadoAtual);
    const fala = limparFala(r.texto);
    const custo = somarCusto(guardado.custo, {
      chamadas: 1,
      tokensEntrada: r.tokensEntrada,
      tokensSaida: r.tokensSaida,
      duracaoMs: r.duracaoMs,
    });

    gravarEstado(sessaoId, tentativa, { ...guardado, estado, custo });

    return NextResponse.json({ fala, estado, custo, modelo: MODELO });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha desconhecida.";
    return NextResponse.json(
      { erro: mensagem, falhaTecnica: true },
      { status: 502 },
    );
  }
}
