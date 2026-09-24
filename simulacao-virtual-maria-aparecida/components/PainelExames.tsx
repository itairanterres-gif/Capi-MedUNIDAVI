"use client";

import { DATA_EXAME_ANTERIOR, LAUDO, MEDICACOES } from "@/lib/caso";

/**
 * Equivalente virtual da folha de exames impressa e da cartela de
 * medicamentos que a paciente atriz trazia na bolsa.
 */
export function PainelExames() {
  return (
    <aside>
      <div className="cartao">
        <h3 style={{ marginTop: 0 }}>Laudo laboratorial</h3>
        <table>
          <thead>
            <tr>
              <th>Exame</th>
              <th>Atual</th>
              <th>{DATA_EXAME_ANTERIOR}</th>
            </tr>
          </thead>
          <tbody>
            {LAUDO.map((r) => (
              <tr key={r.exame}>
                <td>{r.exame}</td>
                <td>{r.atual}</td>
                <td>{r.anterior ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sub" style={{ margin: "8px 0 0" }}>
          TFGe calculada por CKD-EPI, já no laudo.
        </p>
      </div>

      <div className="cartao">
        <h3 style={{ marginTop: 0 }}>Cartela de medicamentos em uso</h3>
        <table>
          <tbody>
            {MEDICACOES.map((m) => (
              <tr key={m.nome}>
                <td>
                  <strong>{m.nome}</strong> {m.dose}
                </td>
                <td>{m.posologia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
