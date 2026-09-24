"use client";

import { CATEGORIAS, CHECKLIST, LEGENDA, Marcacao } from "@/lib/checklist";
import { MarcacaoAvaliada, RevisaoDocente } from "@/lib/exportar";
import { SEM_EVIDENCIA } from "@/lib/checklist";

const OPCOES: Marcacao[] = ["NR", "I", "PA", "A"];

export function ChecklistEditavel({
  preMarcacao,
  revisao,
  editavel,
  aoRevisar,
}: {
  preMarcacao: MarcacaoAvaliada[];
  revisao: Record<number, RevisaoDocente>;
  editavel: boolean;
  aoRevisar?: (id: number, valor: RevisaoDocente) => void;
}) {
  return (
    <div>
      <p className="sub">
        Legenda: {Object.entries(LEGENDA).map(([k, v]) => `${k} = ${v}`).join("; ")}.
      </p>

      {CATEGORIAS.map((categoria) => (
        <div key={categoria} className="cartao">
          <h3 style={{ marginTop: 0 }}>{categoria}</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Item</th>
                <th style={{ width: "10%" }}>IA</th>
                <th>Evidência citada pela IA</th>
                {editavel && <th style={{ width: "22%" }}>Docente</th>}
              </tr>
            </thead>
            <tbody>
              {CHECKLIST.filter((i) => i.categoria === categoria).map((item) => {
                const ia = preMarcacao.find((m) => m.id === item.id);
                const doc = revisao[item.id] ?? { marcacao: null, comentario: "" };
                const ausente =
                  !ia || ia.evidencia.toLowerCase() === SEM_EVIDENCIA;
                return (
                  <tr key={item.id}>
                    <td>
                      {item.id}. {item.texto}
                    </td>
                    <td>{ia?.marcacao ?? "—"}</td>
                    <td>
                      <span
                        className={`evidencia${ausente ? " sem-evidencia" : ""}`}
                      >
                        {ia ? (ausente ? SEM_EVIDENCIA : `“${ia.evidencia}”`) : "—"}
                      </span>
                      {ia && !ia.evidenciaConfere && !ausente && (
                        <div className="sem-evidencia" style={{ fontSize: "0.78rem" }}>
                          ⚠ trecho não localizado literalmente na transcrição —
                          confira antes de aceitar
                        </div>
                      )}
                    </td>
                    {editavel && (
                      <td>
                        <select
                          value={doc.marcacao ?? ""}
                          onChange={(e) =>
                            aoRevisar?.(item.id, {
                              ...doc,
                              marcacao: (e.target.value || null) as Marcacao | null,
                            })
                          }
                        >
                          <option value="">—</option>
                          {OPCOES.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        <textarea
                          rows={2}
                          placeholder="comentário do preceptor"
                          value={doc.comentario}
                          onChange={(e) =>
                            aoRevisar?.(item.id, { ...doc, comentario: e.target.value })
                          }
                          style={{ marginTop: 4 }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
