import { NextRequest, NextResponse } from "next/server";
import { conversar, MAX_TOKENS_AVALIADOR, MODELO } from "@/lib/anthropic";
import {
  CABECALHO_FEEDBACK,
  evidenciaConfere,
  lerMarcacoes,
  promptAvaliador,
} from "@/lib/avaliador";
import { Fala } from "@/lib/sessao";
import { transcricaoEmTexto } from "@/lib/transcricao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Corpo = { falas: Fala[] };

export async function POST(req: NextRequest) {
  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  if (!Array.isArray(corpo.falas) || corpo.falas.length === 0) {
    return NextResponse.json({ erro: "Transcrição vazia." }, { status: 400 });
  }

  const transcricao = transcricaoEmTexto(corpo.falas);

  try {
    // Chamada separada da persona: papel de avaliador, nunca a paciente.
    const r = await conversar({
      system: promptAvaliador(),
      messages: [
        {
          role: "user",
          content: `Transcrição da consulta:\n\n${transcricao}`,
        },
        { role: "assistant", content: "{" },
      ],
      maxTokens: MAX_TOKENS_AVALIADOR,
      temperature: 0,
    });

    const marcacoes = lerMarcacoes("{" + r.texto).map((m) => ({
      ...m,
      evidenciaConfere: evidenciaConfere(m.evidencia, transcricao),
    }));

    return NextResponse.json({
      cabecalho: CABECALHO_FEEDBACK,
      marcacoes,
      modelo: MODELO,
      custo: {
        chamadas: 1,
        tokensEntrada: r.tokensEntrada,
        tokensSaida: r.tokensSaida,
        duracaoMs: r.duracaoMs,
      },
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha desconhecida.";
    return NextResponse.json(
      { erro: mensagem, falhaTecnica: true },
      { status: 502 },
    );
  }
}
