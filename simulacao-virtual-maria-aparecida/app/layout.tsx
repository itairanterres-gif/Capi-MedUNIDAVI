import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulação clínica virtual — Maria Aparecida",
  description:
    "Estação de simulação virtual com paciente virtual gerado por IA. Uso acadêmico e formativo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
