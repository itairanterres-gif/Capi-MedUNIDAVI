"use client";

import { useEffect, useState } from "react";
import { ChecklistEditavel } from "@/components/ChecklistEditavel";
import { assinar, lerEspelho } from "@/lib/canal";
import {
  RevisaoDocente,
  SessaoCompleta,
  baixar,
  paraJson,
  paraMarkdown,
} from "@/lib/exportar";
import { transcricaoEmTexto } from "@/lib/transcricao";
import { FalhaTecnica } from "@/lib/sessao";

export default function Preceptor() {
  const [sessao, setSessao] = useState<SessaoCompleta | null>(null);
  const [revisao, setRevisao] = useState<Record<number, RevisaoDocente>>({});
  const [falhaNova, setFalhaNova] = useState("");
  const [falhasDocente, setFalhasDocente] = useState<FalhaTecnica[]>([]);

  useEffect(() => {
    setSessao(lerEspelho());
    return assinar(setSessao);
  }, []);

  const completa: SessaoCompleta | null = sessao && {
    ...sessao,
    revisaoDocente: revisao,
    falhasTecnicas: [...sessao.falhasTecnicas, ...falhasDocente],
  };

  return (
    <div>
      <h1>Visão do preceptor</h1>
      <p className="sub">
        Transcrição ao vivo e checklist editável. Durante a consulta, não
        intervenha: o debriefing vem depois, conduzido por você. A pré-marcação
        da IA é insumo para revisão — a sua marcação é a que vale.
      </p>

      {!sessao && (
        <div className="cartao">
          <p style={{ margin: 0 }}>
            Nenhuma sessão ativa nesta máquina. Abra a estação em outra aba do
            mesmo navegador e inicie a consulta.
          </p>
        </div>
      )}

      {sessao && (
        <>
          <div className="cartao">
            <div className="linha" style={{ justifyContent: "space-between" }}>
              <span className="mono">{sessao.sessaoId}</span>
              <span className="etiqueta">
                {sessao.custo.chamadas} chamadas · {sessao.custo.tokensSaida}{" "}
                tokens de saída · modelo {sessao.modelo}
              </span>
            </div>
          </div>

          <h2>1ª tentativa</h2>
          <pre className="cartao mono" style={{ whiteSpace: "pre-wrap" }}>
            {transcricaoEmTexto(sessao.tentativa1) || "(ainda sem falas)"}
          </pre>

          {sessao.tentativa2.length > 0 && (
            <>
              <h2>2ª tentativa — momento {sessao.momentoRefeito}</h2>
              <pre className="cartao mono" style={{ whiteSpace: "pre-wrap" }}>
                {transcricaoEmTexto(sessao.tentativa2)}
              </pre>
            </>
          )}

          <h2>Checklist</h2>
          {sessao.preMarcacao.length === 0 ? (
            <p className="sub">
              A pré-marcação aparece aqui quando o interno chega à tela de
              feedback.
            </p>
          ) : (
            <ChecklistEditavel
              preMarcacao={sessao.preMarcacao}
              revisao={revisao}
              editavel
              aoRevisar={(id, valor) =>
                setRevisao((r) => ({ ...r, [id]: valor }))
              }
            />
          )}

          <h2>Falhas técnicas</h2>
          <p className="sub">
            Registradas separadamente das dificuldades do estudante: latência,
            erro de API, falha de reconhecimento de voz, queda de rede.
          </p>
          <ul>
            {[...sessao.falhasTecnicas, ...falhasDocente].map((f, i) => (
              <li key={i} className="sub">
                {new Date(f.em).toLocaleTimeString("pt-BR")} — {f.descricao}
              </li>
            ))}
          </ul>
          <div className="linha">
            <input
              value={falhaNova}
              placeholder="descrever uma falha técnica observada"
              onChange={(e) => setFalhaNova(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
            />
            <button
              className="secundario"
              disabled={!falhaNova.trim()}
              onClick={() => {
                setFalhasDocente((f) => [
                  ...f,
                  { em: Date.now(), descricao: falhaNova.trim() },
                ]);
                setFalhaNova("");
              }}
            >
              Registrar
            </button>
          </div>

          <h2>Exportar</h2>
          <div className="linha">
            <button
              onClick={() =>
                completa &&
                baixar(
                  `${completa.sessaoId}-preceptor.md`,
                  paraMarkdown(completa),
                  "text/markdown",
                )
              }
            >
              Baixar .md
            </button>
            <button
              className="secundario"
              onClick={() =>
                completa &&
                baixar(
                  `${completa.sessaoId}-preceptor.json`,
                  paraJson(completa),
                  "application/json",
                )
              }
            >
              Baixar .json
            </button>
          </div>
        </>
      )}
    </div>
  );
}
