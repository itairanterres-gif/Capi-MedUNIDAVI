"use client";

import { useEffect, useState } from "react";

export function Cronometro({
  duracaoS,
  rodando,
  aoZerar,
  aoMudar,
}: {
  duracaoS: number;
  rodando: boolean;
  aoZerar: () => void;
  aoMudar?: (restantes: number) => void;
}) {
  const [restantes, setRestantes] = useState(duracaoS);

  useEffect(() => setRestantes(duracaoS), [duracaoS]);

  useEffect(() => {
    if (!rodando) return;
    const t = window.setInterval(() => {
      setRestantes((r) => {
        const proximo = r - 1;
        if (proximo <= 0) {
          window.clearInterval(t);
          aoZerar();
          return 0;
        }
        return proximo;
      });
    }, 1000);
    return () => window.clearInterval(t);
    // aoZerar é estável no uso desta estação (definido uma vez por fase)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodando, duracaoS]);

  useEffect(() => {
    aoMudar?.(restantes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restantes]);

  const m = Math.floor(restantes / 60);
  const s = restantes % 60;
  return (
    <span className={`cronometro${restantes <= 60 ? " acabando" : ""}`}>
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
