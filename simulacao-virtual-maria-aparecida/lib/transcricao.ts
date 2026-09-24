import { Fala } from "./sessao";

export function transcricaoEmTexto(falas: Fala[]): string {
  return falas
    .map(
      (f) =>
        `${f.papel === "interno" ? "INTERNO" : "MARIA APARECIDA"}: ${f.texto}`,
    )
    .join("\n");
}

export function horario(em: number): string {
  return new Date(em).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
