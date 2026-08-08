import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { RentVsBuyCalculator } from "@/components/RentVsBuyCalculator";

export const metadata: Metadata = {
  title: "Comprar o alquilar",
  description:
    "Calculadora de patrimonio: descubre si te conviene comprar o alquilar e invertir en Madrid. Simulación año a año del patrimonio neto, con impuestos, revalorización y tus planes de futuro.",
};

export default function ComprarOAlquilarPage() {
  return (
    <div className="relative z-10">
      <SiteNav />
      <RentVsBuyCalculator />
    </div>
  );
}
