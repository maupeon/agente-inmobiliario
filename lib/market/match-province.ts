import type { ProvincePrice } from "./types";

/**
 * Empareja el nombre de provincia que envía Claude con el catálogo del INE.
 * El usuario puede escribir "A Coruña", "Coruña", "La Coruña", "Gipuzkoa", etc.
 * — todas estas variantes deben caer en la misma fila.
 */

const ALIASES: Record<string, string> = {
  "a coruna": "la coruña",
  "coruna": "la coruña",
  "la coruna": "la coruña",
  "coruña": "la coruña",
  "a coruña": "la coruña",
  "gipuzkoa": "guipúzcoa",
  "guipuzcoa": "guipúzcoa",
  "bizkaia": "vizcaya",
  "vizcaya": "vizcaya",
  "araba": "álava",
  "alava": "álava",
  "ourense": "orense",
  "girona": "gerona",
  "lleida": "lérida",
  "illes balears": "baleares",
  "islas baleares": "baleares",
  "santa cruz tenerife": "santa cruz de tenerife",
  "tenerife": "santa cruz de tenerife",
  "gran canaria": "las palmas",
};

export function findProvincePrice(
  catalog: ProvincePrice[],
  needle: string
): ProvincePrice | null {
  const norm = normalize(needle);
  const aliased = ALIASES[norm] ?? norm;

  const exact = catalog.find((p) => normalize(p.provincia) === aliased);
  if (exact) return exact;

  const contained = catalog.find(
    (p) => normalize(p.provincia).includes(aliased) || aliased.includes(normalize(p.provincia))
  );
  return contained ?? null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(provincia de|provincia)\s+/i, "")
    .trim();
}
