"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Modo de voz opcional (Web Speech API, pt-BR). A fidelidade não verbal
 * da modalidade é baixa; a voz devolve prosódia — entonação de medo, de
 * alívio — mas não devolve postura corporal nem gestos. Quando o
 * navegador não suporta, a estação funciona inteiramente por texto.
 */

type Reconhecimento = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function useVoz(aoTranscrever: (texto: string) => void) {
  const [suportaEntrada, setSuportaEntrada] = useState(false);
  const [suportaSaida, setSuportaSaida] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const callback = useRef(aoTranscrever);
  callback.current = aoTranscrever;

  useEffect(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSuportaEntrada(Boolean(Ctor));
    setSuportaSaida(typeof window.speechSynthesis !== "undefined");
    if (!Ctor) return;

    const r: Reconhecimento = new Ctor();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const texto = Array.from(e.results as ArrayLike<any>)
        .map((res: any) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (texto) callback.current(texto);
    };
    r.onerror = () => setOuvindo(false);
    r.onend = () => setOuvindo(false);
    reconhecimento.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* já encerrado */
      }
    };
  }, []);

  const ouvir = useCallback(() => {
    if (!reconhecimento.current) return;
    try {
      reconhecimento.current.start();
      setOuvindo(true);
    } catch {
      setOuvindo(false);
    }
  }, []);

  const pararDeOuvir = useCallback(() => {
    try {
      reconhecimento.current?.stop();
    } finally {
      setOuvindo(false);
    }
  }, []);

  const falar = useCallback((texto: string) => {
    if (typeof window.speechSynthesis === "undefined") return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 0.98;
    const vozPt = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (vozPt) u.voice = vozPt;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const calar = useCallback(() => {
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { suportaEntrada, suportaSaida, ouvindo, ouvir, pararDeOuvir, falar, calar };
}
