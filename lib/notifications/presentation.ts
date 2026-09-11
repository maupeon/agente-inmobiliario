import type { RecommendationDigest } from "./types";

/** local_date identifica el día de la selección, sin reconvertirlo al huso del lector. */
export function digestTitle(digest: Pick<RecommendationDigest, "local_date" | "items">): string {
  const date = new Date(`${digest.local_date}T12:00:00Z`);
  const label = Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date)
    : digest.local_date;
  return digest.items.length
    ? `Tu nuevo top ${digest.items.length} del día ${label}`
    : `Tu selección del día ${label}`;
}
