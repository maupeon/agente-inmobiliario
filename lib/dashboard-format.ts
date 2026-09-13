import type { CommuteMode, PropertyValuation } from "@/types";

/**
 * Colores y etiquetas compartidos entre el mapa y el inspector del panel.
 * Los hex provienen de los tokens de `tailwind.config.ts` (sage / HabitIA /
 * clay / rose) para que el mapa hable el mismo idioma cromático que la UI.
 */

type Banda = NonNullable<PropertyValuation["banda"]>;

/** Color del pin según lo caro que sea frente a la referencia de la zona. */
export const BANDA_COLOR: Record<Banda, string> = {
  barato: "#2F7A43",
  ajustado: "#6E8B2E",
  en_linea: "#B86A0A",
  caro: "#B5532A",
  muy_caro: "#9F2F2D",
};

const NEUTRAL = "#A8A49B"; // mist, para precio sin referencia

export function bandaColor(banda: Banda | null | undefined): string {
  return banda ? BANDA_COLOR[banda] : NEUTRAL;
}

/** Color del halo de barrio según el índice de seguridad (0-100). */
export function safetyColor(indice: number | null | undefined): string {
  if (indice == null) return NEUTRAL;
  if (indice >= 75) return "#2F7A43"; // sage
  if (indice >= 60) return "#2D7C59"; // verde HabitIA
  return "#9F2F2D"; // rose
}

export const MODE_LABEL: Record<CommuteMode, string> = {
  a_pie: "a pie",
  bici: "en bici",
  coche: "en coche",
  transporte: "en transporte",
};

/** "+12%" / "−8%" / "en línea". */
export function formatDiff(diff: number | null | undefined): string {
  if (diff == null) return "—";
  if (Math.abs(diff) < 0.5) return "en línea";
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${Math.abs(Math.round(diff))}%`;
}

/** Etiquetas siempre relativas a un escenario individual válido, jamás a una media. */
export function priceLabel(v?: PropertyValuation | null): "Barato" | "Justo" | "Caro" | null {
  if (!v || v.nivel !== "modelo" || v.estadoModelo !== "ok" || v.fromFallback || !v.banda || v.diferenciaPorcentual == null) return null;
  return v.banda === "barato" || v.banda === "ajustado" ? "Barato" : v.banda === "en_linea" ? "Justo" : "Caro";
}
export function priceComparison(v?: PropertyValuation | null): string {
  if (!v || v.nivel !== "modelo" || v.estadoModelo !== "ok" || v.fromFallback || v.diferenciaPorcentual == null) return v?.referenciaEurM2 != null ? "referencia territorial disponible, sin valoración individual" : "no hay estimación individual comparable";
  const diff = Math.abs(Math.round(v.diferenciaPorcentual));
  return diff === 0 ? "precio cercano a la estimación del escenario indexado" : `${diff}% ${v.diferenciaPorcentual < 0 ? "por debajo" : "por encima"} de la estimación del escenario indexado`;
}
