import { ValidationError } from "@/lib/errors";
import { getMarketData } from "@/lib/market/cache";
import { findRentReference } from "@/lib/market/rent";
import type { RentValuation } from "@/types";

export interface ValorarAlquilerInput {
  zona: string;
  provincia?: string;
  /** Renta mensual del anuncio, en euros. */
  precioMes: number;
  /** Superficie del anuncio, en m². */
  metros: number;
}

export async function runValorarAlquiler(
  input: ValorarAlquilerInput
): Promise<RentValuation> {
  if (typeof input?.zona !== "string" || !input.zona.trim()) throw new ValidationError("zona es obligatoria");
  if (!Number.isFinite(input?.precioMes) || input.precioMes <= 0)
    throw new ValidationError("precioMes debe ser un número positivo");
  if (!Number.isFinite(input?.metros) || input.metros <= 0)
    throw new ValidationError("metros debe ser un número positivo");

  const ref = await getMarketData("rent_reference");
  const match = ref.fromFallback ? null : findRentReference(ref.data, input.zona, input.provincia);

  const eurM2Mes = round1(input.precioMes / input.metros);
  const diferencia =
    match != null
      ? round1(((eurM2Mes - match.eurM2Mes) / match.eurM2Mes) * 100)
      : null;
  const banda = diferencia != null ? classify(diferencia) : null;

  return {
    zona: {
      consultada: input.zona,
      referencia: match ? match.referencia : null,
    },
    precioMes: Math.round(input.precioMes),
    eurM2Mes,
    referenciaEurM2Mes: match ? match.eurM2Mes : null,
    rangoZona:
      match && match.min != null && match.max != null
        ? { min: match.min, max: match.max }
        : null,
    diferenciaPorcentual: diferencia,
    valoracion: banda ? VALORACION[banda] : null,
    banda,
    nivel: match ? match.nivel : null,
    fuente: ref.data.fuente,
    actualizado: ref.updatedAt,
    fromFallback: ref.fromFallback,
  };
}

type Banda = NonNullable<RentValuation["banda"]>;

const VALORACION: Record<Banda, string> = {
  barato: "barato para lo que se paga en la zona",
  ajustado: "ligeramente por debajo de la media de la zona",
  en_linea: "en línea con la media de la zona",
  caro: "por encima de la media de la zona",
  muy_caro: "bastante caro frente a la media de la zona",
};

function classify(diffPct: number): Banda {
  if (diffPct <= -12) return "barato";
  if (diffPct <= -4) return "ajustado";
  if (diffPct < 8) return "en_linea";
  if (diffPct < 20) return "caro";
  return "muy_caro";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
