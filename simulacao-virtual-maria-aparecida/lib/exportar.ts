import { CABECALHO_FEEDBACK } from "./avaliador";
import { CATEGORIAS, CHECKLIST, LEGENDA, Marcacao } from "./checklist";
import { Custo, Fala, FalhaTecnica } from "./sessao";
import { transcricaoEmTexto } from "./transcricao";

export type MarcacaoAvaliada = {
  id: number;
  marcacao: Marcacao;
  evidencia: string;
  evidenciaConfere: boolean;
};

export type RevisaoDocente = {
  marcacao: Marcacao | null;
  comentario: string;
};

export type SessaoCompleta = {
  sessaoId: string;
  iniciadaEm: number;
  modelo: string;
  tentativa1: Fala[];
  momentoRefeito: 1 | 2 | 3 | null;
  tentativa2: Fala[];
  preMarcacao: MarcacaoAvaliada[];
  revisaoDocente: Record<number, RevisaoDocente>;
  falhasTecnicas: FalhaTecnica[];
  custo: Custo;
};

function cabecalho(s: SessaoCompleta): string[] {
  const inicio = new Date(s.iniciadaEm).toLocaleString("pt-BR");
  return [
    "# Simulação clínica virtual — Maria Aparecida",
    "",
    `- Sessão: \`${s.sessaoId}\``,
    `- Início: ${inicio}`,
    `- Modelo: ${s.modelo}`,
    `- Chamadas à API: ${s.custo.chamadas} · tokens entrada ${s.custo.tokensEntrada} · tokens saída ${s.custo.tokensSaida} · tempo de API ${(s.custo.duracaoMs / 1000).toFixed(1)} s`,
    "",
    "> Registro **formativo**. A pré-marcação do checklist foi produzida por IA e só tem valor depois de revisada pelo preceptor. Não é nota.",
    "",
  ];
}

export function paraMarkdown(s: SessaoCompleta): string {
  const l: string[] = cabecalho(s);

  l.push("## 1ª tentativa — consulta (15 min)", "");
  l.push("```", transcricaoEmTexto(s.tentativa1) || "(sem falas)", "```", "");

  l.push(
    `## 2ª tentativa — momento ${s.momentoRefeito ?? "—"} (5 min)`,
    "",
  );
  l.push(
    "```",
    s.tentativa2.length ? transcricaoEmTexto(s.tentativa2) : "(não realizada)",
    "```",
    "",
  );

  l.push("## Checklist", "");
  l.push(`*${CABECALHO_FEEDBACK}.*`, "");
  l.push(
    `Legenda: ${Object.entries(LEGENDA)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")}.`,
    "",
  );

  for (const categoria of CATEGORIAS) {
    l.push(`### ${categoria}`, "");
    l.push("| # | Item | IA | Docente | Evidência citada pela IA |");
    l.push("|---|---|---|---|---|");
    for (const item of CHECKLIST.filter((i) => i.categoria === categoria)) {
      const ia = s.preMarcacao.find((m) => m.id === item.id);
      const doc = s.revisaoDocente[item.id];
      const alerta = ia && !ia.evidenciaConfere ? " ⚠ trecho não localizado" : "";
      l.push(
        `| ${item.id} | ${item.texto.replace(/\|/g, "\\|")} | ${ia?.marcacao ?? "—"} | ${doc?.marcacao ?? "—"} | ${(ia?.evidencia ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ")}${alerta} |`,
      );
    }
    l.push("");
  }

  const comentarios = Object.entries(s.revisaoDocente).filter(
    ([, v]) => v.comentario.trim(),
  );
  if (comentarios.length) {
    l.push("### Comentários do preceptor", "");
    for (const [id, v] of comentarios) {
      l.push(`- Item ${id}: ${v.comentario.trim()}`);
    }
    l.push("");
  }

  l.push("## Falhas técnicas", "");
  if (s.falhasTecnicas.length) {
    for (const f of s.falhasTecnicas) {
      l.push(`- ${new Date(f.em).toLocaleTimeString("pt-BR")} — ${f.descricao}`);
    }
  } else {
    l.push("- Nenhuma registrada.");
  }
  l.push(
    "",
    "> Falhas técnicas são registradas separadamente das dificuldades do estudante: latência, erro de API, falha de reconhecimento de voz e afins não são desempenho do interno.",
    "",
  );

  return l.join("\n");
}

export function paraJson(s: SessaoCompleta): string {
  return JSON.stringify(
    {
      documento: "simulacao-virtual-maria-aparecida",
      versao: 1,
      natureza: "registro formativo; pré-marcação por IA sujeita a revisão docente",
      ...s,
    },
    null,
    2,
  );
}

export function baixar(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
