import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HabitIA — Encuentra piso para alquilar o comprar",
    template: "%s · HabitIA",
  },
  description:
    "Encuentra pisos para alquilar o comprar en España con HabitIA. Compara precios, barrios y trayectos, guarda favoritos y calcula tu hipoteca.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "HabitIA — Encuentra piso para alquilar o comprar",
    description:
      "Tu búsqueda de vivienda, más clara: pisos para alquilar o comprar, comparados con datos de precio, barrio y trayecto.",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F8F5",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="bg-paper text-ink min-h-[100dvh] antialiased">
        <div className="grainy-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
