/**
 * Roda as consultas de teste contra a API da Anthropic, usando exatamente
 * os mesmos prompts da aplicação (lib/persona.ts e lib/avaliador.ts) — sem
 * subir o servidor Next. Salva uma transcrição por roteiro em
 * testes/transcricoes/ e um resumo em testes/transcricoes/RESUMO.md.
 *
 *   ANTHROPIC_API_KEY=... npm run testes
 *   ANTHROPIC_API_KEY=... npm run testes -- a-interno-excelente
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { conversar, MAX_TOKENS_AVALIADOR, MAX_TOKENS_PACIENTE, MODELO } from "../lib/anthropic";
import { lerMarcacoes, promptAvaliador } from "../lib/avaliador";
import { CHECKLIST } from "../lib/checklist";
import {
  ESTADO_INICIAL,
  EstadoMomentos,
  lerEstado,
  limparFala,
  promptPaciente,
} from "../lib/persona";
import { Custo, CUSTO_ZERO, DURACAO_CONSULTA_S, Fala, somarCusto } from "../lib/sessao";
import { transcricaoEmTexto } from "../lib/transcricao";
import { ROTEIROS, Roteiro } from "./roteiros";
import {
  Verificacao,
  avaliadorCitaEvidencia,
  disparouOsTresGatilhos,
  naoEnsina,
  naoInventouExame,
  naoSaiDoPersonagem,
} from "./verificacoes";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "transcricoes");

/** Gatilhos que cada roteiro deve provocar, dado o que o interno faz. */
const GATILHOS_ESPERADOS: Record<string, (1 | 2 | 3)[]> = {
  "a-interno-excelente": [1, 2, 3],
  "b-interno-glicocentrico": [1, 2, 3],
  "c-interno-ignora-medo": [1, 2, 3],
  "d-interno-pede-dica": [1],
};

type Resultado = {
  roteiro: Roteiro;
  falas: Fala[];
  estado: EstadoMomentos;
  custo: Custo;
  verificacoes: Verificacao[];
};

async function rodar(roteiro: Roteiro): Promise<Resultado> {
  const falas: Fala[] = [];
  let estado: EstadoMomentos = { ...ESTADO_INICIAL };
  let custo: Custo = { ...CUSTO_ZERO };
  const passo = Math.floor(DURACAO_CONSULTA_S / roteiro.falas.length);

  for (let i = 0; i < roteiro.falas.length; i++) {
    falas.push({ papel: "interno", texto: roteiro.falas[i], em: Date.now() });
    const ultima = i === roteiro.falas.length - 1;
    const segundosRestantes = Math.max(0, DURACAO_CONSULTA_S - (i + 1) * passo);

    const messages = falas.map((f) => ({
      role: (f.papel === "interno" ? "user" : "assistant") as "user" | "assistant",
      content: f.texto,
    }));
    if (ultima) {
      messages[messages.length - 1].content +=
        "\n\n[O tempo da consulta terminou. Despeça-se agora, em uma ou duas frases, de forma coerente com o que aconteceu nesta consulta. Se o medo da diálise não tiver sido tratado, retome-o antes de se despedir.]";
    }

    const r = await conversar({
      system: promptPaciente({ estado, segundosRestantes }),
      messages,
      maxTokens: MAX_TOKENS_PACIENTE,
    });

    estado = lerEstado(r.texto, estado);
    custo = somarCusto(custo, {
      chamadas: 1,
      tokensEntrada: r.tokensEntrada,
      tokensSaida: r.tokensSaida,
      duracaoMs: r.duracaoMs,
    });
    falas.push({ papel: "paciente", texto: limparFala(r.texto), em: Date.now() });
    process.stdout.write(".");
  }

  const transcricao = transcricaoEmTexto(falas);
  const avaliacao = await conversar({
    system: promptAvaliador(),
    messages: [
      { role: "user", content: `Transcrição da consulta:\n\n${transcricao}` },
      { role: "assistant", content: "{" },
    ],
    maxTokens: MAX_TOKENS_AVALIADOR,
    temperature: 0,
  });
  custo = somarCusto(custo, {
    chamadas: 1,
    tokensEntrada: avaliacao.tokensEntrada,
    tokensSaida: avaliacao.tokensSaida,
    duracaoMs: avaliacao.duracaoMs,
  });
  const marcacoes = lerMarcacoes("{" + avaliacao.texto);

  const verificacoes: Verificacao[] = [
    naoInventouExame(falas),
    naoEnsina(falas),
    naoSaiDoPersonagem(falas),
    disparouOsTresGatilhos(estado, GATILHOS_ESPERADOS[roteiro.id] ?? [1, 2, 3]),
    avaliadorCitaEvidencia(marcacoes, transcricao),
  ];

  const linhas = [
    `# ${roteiro.titulo}`,
    "",
    roteiro.descricao,
    "",
    `- Modelo: ${MODELO}`,
    `- Chamadas: ${custo.chamadas} · tokens entrada ${custo.tokensEntrada} · saída ${custo.tokensSaida} · ${(custo.duracaoMs / 1000).toFixed(1)} s`,
    `- Estado final do arco: m1=${estado.m1Disparado} (acolhido=${estado.m1Acolhido}, recobranças=${estado.m1Recobrancas}) · m2=${estado.m2Disparado} (compreendido=${estado.m2Compreendido}) · m3=${estado.m3Disparado} (resolvido=${estado.m3Resolvido})`,
    "",
    "## Transcrição",
    "",
    "```",
    transcricao,
    "```",
    "",
    "## Pré-marcação do avaliador",
    "",
    "| # | Item | Marcação | Evidência citada |",
    "|---|---|---|---|",
    ...marcacoes.map((m) => {
      const item = CHECKLIST.find((i) => i.id === m.id)!;
      return `| ${m.id} | ${item.texto.replace(/\|/g, "\\|")} | ${m.marcacao} | ${m.evidencia.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`;
    }),
    "",
    "## Verificações",
    "",
    ...verificacoes.map(
      (v) => `- ${v.passou ? "PASSOU" : "FALHOU"} — ${v.nome}: ${v.detalhe}`,
    ),
    "",
  ];

  mkdirSync(SAIDA, { recursive: true });
  writeFileSync(join(SAIDA, `${roteiro.id}.md`), linhas.join("\n"), "utf-8");

  return { roteiro, falas, estado, custo, verificacoes };
}

async function principal() {
  const filtro = process.argv.slice(2);
  const alvos = filtro.length
    ? ROTEIROS.filter((r) => filtro.includes(r.id))
    : ROTEIROS;

  const resultados: Resultado[] = [];
  for (const roteiro of alvos) {
    process.stdout.write(`\n${roteiro.titulo} `);
    resultados.push(await rodar(roteiro));
  }

  const total = resultados.reduce((c, r) => somarCusto(c, r.custo), { ...CUSTO_ZERO });
  const falhou = resultados.filter((r) => r.verificacoes.some((v) => !v.passou));

  const resumo = [
    "# Resumo das consultas de teste",
    "",
    `- Modelo: ${MODELO}`,
    `- Executado em: ${new Date().toISOString()}`,
    `- Total: ${total.chamadas} chamadas · ${total.tokensEntrada} tokens de entrada · ${total.tokensSaida} de saída · ${(total.duracaoMs / 1000).toFixed(1)} s de API`,
    "",
    "| Roteiro | Verificações | Situação |",
    "|---|---|---|",
    ...resultados.map((r) => {
      const ok = r.verificacoes.filter((v) => v.passou).length;
      return `| ${r.roteiro.titulo} | ${ok}/${r.verificacoes.length} | ${ok === r.verificacoes.length ? "passou" : "revisar"} |`;
    }),
    "",
    ...resultados.flatMap((r) => [
      `## ${r.roteiro.titulo}`,
      "",
      ...r.verificacoes.map(
        (v) => `- ${v.passou ? "PASSOU" : "FALHOU"} — ${v.nome}: ${v.detalhe}`,
      ),
      "",
    ]),
  ];

  mkdirSync(SAIDA, { recursive: true });
  writeFileSync(join(SAIDA, "RESUMO.md"), resumo.join("\n"), "utf-8");

  console.log(`\n\nTranscrições em ${SAIDA}`);
  if (falhou.length) {
    console.error(
      `Verificações com falha em: ${falhou.map((r) => r.roteiro.id).join(", ")}`,
    );
    process.exitCode = 1;
  } else {
    console.log("Todas as verificações passaram.");
  }
}

principal().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
