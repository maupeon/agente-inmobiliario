import type { CommuteMode, PropertyValuation } from "@/types";

/**
 * Colores y etiquetas compartidos entre el mapa y el inspector del panel.
 * Los hex provienen de los tokens de `tailwind.config.ts` (sage / saffron /
 * clay / rose) para que el mapa hable el mismo idioma cromático que la UI.
 */

type Banda = NonNullable<PropertyValuation["banda"]>;

/** Color del pin según lo caro que sea frente a la referencia de la zona. */
export const BANDA_COLOR: Record<Banda, string> = {
  barato: "#2F7A43",
  ajustado: "#6E8B2E",
  en_linea: "#956400",
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
  if (indice >= 60) return "#956400"; // saffron
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
