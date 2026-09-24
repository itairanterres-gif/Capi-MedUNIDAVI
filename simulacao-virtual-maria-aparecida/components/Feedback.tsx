"use client";

import { CABECALHO_FEEDBACK } from "@/lib/avaliador";
import { ChecklistEditavel } from "./ChecklistEditavel";
import { MarcacaoAvaliada } from "@/lib/exportar";

export function Feedback({
  preMarcacao,
  carregando,
  erro,
  momento,
  aoEscolherMomento,
  aoIniciarSegunda,
  aoPular,
}: {
  preMarcacao: MarcacaoAvaliada[];
  carregando: boolean;
  erro: string | null;
  momento: 1 | 2 | 3;
  aoEscolherMomento: (m: 1 | 2 | 3) => void;
  aoIniciarSegunda: () => void;
  aoPular: () => void;
}) {
  return (
    <div>
      <h1>{CABECALHO_FEEDBACK}</h1>
      <p className="sub">
        A paciente saiu de cena. Esta pré-marcação foi produzida por uma chamada
        separada, no papel de avaliador — nunca pela persona. Cada marcação cita
        o trecho da transcrição que a sustenta, ou declara que não há evidência.
        Quem decide é o preceptor.
      </p>

      {carregando && <p>Pré-marcando o checklist…</p>}
      {erro && (
        <div className="aviso">
          Falha técnica na pré-marcação: {erro}. Registre no campo de falhas
          técnicas ao exportar — isso não é desempenho do interno.
        </div>
      )}

      {!carregando && preMarcacao.length > 0 && (
        <ChecklistEditavel preMarcacao={preMarcacao} revisao={{}} editavel={false} />
      )}

      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Segunda tentativa (5 minutos)</h2>
        <p>
          Escolha o momento que você quer refazer. A paciente retoma a cena a
          partir daquele gatilho, sem memória da primeira tentativa.
        </p>
        <div className="linha">
          <label className="linha" style={{ gap: 6 }}>
            <input
              type="radio"
              style={{ width: "auto" }}
              checked={momento === 1}
              onChange={() => aoEscolherMomento(1)}
            />
            <span>1 — o medo do rim</span>
          </label>
          <label className="linha" style={{ gap: 6 }}>
            <input
              type="radio"
              style={{ width: "auto" }}
              checked={momento === 2}
              onChange={() => aoEscolherMomento(2)}
            />
            <span>2 — por que outro remédio</span>
          </label>
          <label className="linha" style={{ gap: 6 }}>
            <input
              type="radio"
              style={{ width: "auto" }}
              checked={momento === 3}
              onChange={() => aoEscolherMomento(3)}
            />
            <span>3 — o acesso ao remédio</span>
          </label>
        </div>
        <div className="linha espaco">
          <button onClick={aoIniciarSegunda}>Iniciar segunda tentativa</button>
          <button className="secundario" onClick={aoPular}>
            Seguir sem segunda tentativa
          </button>
        </div>
      </div>
    </div>
  );
}
