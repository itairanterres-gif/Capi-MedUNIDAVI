"use client";

import { useEffect, useRef, useState } from "react";
import { Fala } from "@/lib/sessao";
import { useVoz } from "@/lib/voz";

export function Chat({
  falas,
  ocupado,
  encerrado,
  aoEnviar,
  vozLigada,
  aoAlternarVoz,
  ultimaFalaPaciente,
}: {
  falas: Fala[];
  ocupado: boolean;
  encerrado: boolean;
  aoEnviar: (texto: string) => void;
  vozLigada: boolean;
  aoAlternarVoz: (v: boolean) => void;
  ultimaFalaPaciente: string | null;
}) {
  const [rascunho, setRascunho] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const jaFalado = useRef<string | null>(null);

  const voz = useVoz((texto) => setRascunho((r) => (r ? `${r} ${texto}` : texto)));

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [falas.length, ocupado]);

  useEffect(() => {
    if (!vozLigada || !ultimaFalaPaciente) return;
    if (jaFalado.current === ultimaFalaPaciente) return;
    jaFalado.current = ultimaFalaPaciente;
    voz.falar(ultimaFalaPaciente);
  }, [vozLigada, ultimaFalaPaciente, voz]);

  function enviar() {
    const texto = rascunho.trim();
    if (!texto || ocupado || encerrado) return;
    setRascunho("");
    aoEnviar(texto);
  }

  return (
    <div>
      <div className="conversa">
        {falas.map((f, i) => (
          <div key={i} className={`fala ${f.papel}`}>
            <span className="quem">
              {f.papel === "interno" ? "Você" : "Maria Aparecida"}
            </span>
            <span className="texto">{f.texto}</span>
          </div>
        ))}
        {ocupado && (
          <div className="fala paciente">
            <span className="quem">Maria Aparecida</span>
            <span className="texto">…</span>
          </div>
        )}
        <div ref={fim} />
      </div>

      <div className="espaco">
        <textarea
          rows={3}
          value={rascunho}
          disabled={encerrado}
          placeholder={
            encerrado ? "Consulta encerrada." : "Escreva sua fala e envie com Ctrl+Enter."
          }
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <div className="linha espaco">
          <button onClick={enviar} disabled={ocupado || encerrado || !rascunho.trim()}>
            Enviar
          </button>

          {voz.suportaEntrada ? (
            <button
              className="secundario"
              disabled={encerrado}
              onClick={() => (voz.ouvindo ? voz.pararDeOuvir() : voz.ouvir())}
            >
              {voz.ouvindo ? "Parar de ditar" : "Ditar (pt-BR)"}
            </button>
          ) : (
            <span className="etiqueta">ditado indisponível neste navegador</span>
          )}

          {voz.suportaSaida ? (
            <label className="linha" style={{ gap: 6 }}>
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={vozLigada}
                onChange={(e) => {
                  aoAlternarVoz(e.target.checked);
                  if (!e.target.checked) voz.calar();
                }}
              />
              <span className="etiqueta">voz da paciente</span>
            </label>
          ) : (
            <span className="etiqueta">síntese de voz indisponível</span>
          )}
        </div>
      </div>
    </div>
  );
}
