import type { Metadata } from "next";
import { Presentation } from "./Presentation";

export const metadata: Metadata = {
  title: "Presentación TFM",
  description: "Defensa de HabitIA: metodología, resultados e innovación.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function PresentacionPage() {
  return <Presentation />;
}
