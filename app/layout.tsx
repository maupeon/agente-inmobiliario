import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agente Inmobiliario — IA conversacional para el mercado español",
  description:
    "Habla en lenguaje natural y deja que el Agente Inmobiliario busque pisos en Idealista, te enseñe los detalles y calcule la hipoteca. IA especializada en el mercado español.",
  metadataBase: new URL("https://agente-inmobiliario.app"),
  openGraph: {
    title: "Agente Inmobiliario",
    description: "IA inmobiliaria conversacional para España.",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}
    >
      <body className="bg-paper text-ink min-h-[100dvh] antialiased">
        <div className="grainy-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
