"use client";

import { SessaoCompleta } from "./exportar";

/**
 * Ponte entre a tela do interno e a tela do preceptor na MESMA máquina.
 * Sem banco de dados e sem servidor de estado: BroadcastChannel quando
 * disponível, com espelho em localStorage (evento `storage`) como reserva
 * — o que também cobre o caso de a aba do preceptor ser aberta depois.
 */

export const NOME_CANAL = "simulacao-maria-aparecida";
export const CHAVE_ESPELHO = "simulacao-maria-aparecida:sessao";

type Ouvinte = (s: SessaoCompleta) => void;

export function publicar(sessao: SessaoCompleta) {
  try {
    localStorage.setItem(CHAVE_ESPELHO, JSON.stringify(sessao));
  } catch {
    /* modo privado ou cota cheia: o BroadcastChannel ainda cobre a aba viva */
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const c = new BroadcastChannel(NOME_CANAL);
      c.postMessage(sessao);
      c.close();
    }
  } catch {
    /* sem BroadcastChannel: o espelho em localStorage cobre */
  }
}

export function lerEspelho(): SessaoCompleta | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ESPELHO);
    return bruto ? (JSON.parse(bruto) as SessaoCompleta) : null;
  } catch {
    return null;
  }
}

export function assinar(ouvinte: Ouvinte): () => void {
  let canal: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      canal = new BroadcastChannel(NOME_CANAL);
      canal.onmessage = (e) => ouvinte(e.data as SessaoCompleta);
    }
  } catch {
    canal = null;
  }

  const aoMudarArmazenamento = (e: StorageEvent) => {
    if (e.key === CHAVE_ESPELHO && e.newValue) {
      try {
        ouvinte(JSON.parse(e.newValue) as SessaoCompleta);
      } catch {
        /* payload corrompido: ignora e espera o próximo */
      }
    }
  };
  window.addEventListener("storage", aoMudarArmazenamento);

  // Reserva final: se as duas vias falharem, uma sondagem leve mantém a
  // transcrição do preceptor viva.
  const sondagem = window.setInterval(() => {
    const s = lerEspelho();
    if (s) ouvinte(s);
  }, 4000);

  return () => {
    canal?.close();
    window.removeEventListener("storage", aoMudarArmazenamento);
    window.clearInterval(sondagem);
  };
}
