import { MADRID_BOUNDARY } from "./geo/madrid-boundary";
import type { Property } from "@/types";

export const MADRID_SCOPE_MESSAGE = "HabitIA está disponible por ahora en Madrid capital. Elige un barrio o una dirección dentro de Madrid.";
export const MADRID_CENTER = { lat: 40.4168, lon: -3.7038, zoom: 11 };

function insideRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [xj, yj] = ring[j];
    if ((y > lat) !== (yj > lat) && lon < (xj - x) * (lat - y) / (yj - y) + x) inside = !inside;
  }
  return inside;
}

/** Límite municipal; un rectángulo incluiría municipios vecinos como Pozuelo. */
export function isMadridPoint(lat: unknown, lon: unknown): boolean {
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return MADRID_BOUNDARY.some(([outer, ...holes]) => insideRing(lon, lat, outer) && !holes.some(ring => insideRing(lon, lat, ring)));
}

/** También filtra resultados de radios que cruzan el límite y cachés antiguas. */
export function isMadridProperty(p: Property): boolean {
  const municipality = p.municipality?.trim().toLocaleLowerCase("es");
  if (municipality && municipality !== "madrid") return false;
  if (p.latitude != null && p.longitude != null) return isMadridPoint(p.latitude, p.longitude);
  return municipality === "madrid";
}
