import { FALLBACK_RENT_REFERENCE } from "./fixtures";
import type {
  RentProvincePrice,
  RentReference,
  RentZonePrice,
} from "./types";

/**
 * Referencia de alquiler €/m²/mes por barrio y provincia.
 *
 * La descarga e integración del SERPAVI oficial no están implementadas.
 * Este método devuelve únicamente ejemplos manuales. `market/cache` los
 * marca siempre como fallback y `enrich` evita usarlos para valorar anuncios.
 */
export async function fetchRentReference(): Promise<RentReference> {
  // TODO: parsear el CSV/Excel del Sistema Estatal de Índices de Alquiler.
  return FALLBACK_RENT_REFERENCE;
}

export interface RentMatch {
  eurM2Mes: number;
  min: number | null;
  max: number | null;
  /** Etiqueta legible de lo que se ha emparejado. */
  referencia: string;
  nivel: "barrio" | "provincia";
}

/**
 * Empareja la zona que pide el usuario con la referencia más específica
 * disponible: primero intenta barrio/distrito, y si no, cae a provincia.
 * `zona` puede venir como "Malasaña", "Chamberí Madrid", "Eixample, Barcelona"…
 */
export function findRentReference(
  ref: RentReference,
  zona: string,
  provincia?: string
): RentMatch | null {
  const norm = normalize(zona);

  // 1) Coincidencia por barrio/distrito.
  const zoneHit =
    ref.zonas.find((z) => normalize(z.zona) === norm) ??
    ref.zonas.find(
      (z) => norm.includes(normalize(z.zona)) || normalize(z.zona).includes(norm)
    );
  if (zoneHit) return fromZone(zoneHit);

  // 2) Respaldo por provincia (la indicada o inferida del texto de la zona).
  const provNeedle = provincia ? normalize(provincia) : norm;
  const provHit =
    ref.provincias.find((p) => normalize(p.provincia) === provNeedle) ??
    ref.provincias.find(
      (p) =>
        provNeedle.includes(normalize(p.provincia)) ||
        normalize(p.provincia).includes(provNeedle)
    );
  if (provHit) return fromProvince(provHit);

  return null;
}

function fromZone(z: RentZonePrice): RentMatch {
  return {
    eurM2Mes: z.eurM2Mes,
    min: z.min ?? null,
    max: z.max ?? null,
    referencia: z.municipio ? `${z.zona} (${z.municipio})` : z.zona,
    nivel: "barrio",
  };
}

function fromProvince(p: RentProvincePrice): RentMatch {
  return {
    eurM2Mes: p.eurM2Mes,
    min: p.min ?? null,
    max: p.max ?? null,
    referencia: `provincia de ${p.provincia}`,
    nivel: "provincia",
  };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
