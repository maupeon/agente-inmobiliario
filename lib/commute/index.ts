import "server-only";
import type { CommuteLeg, CommuteMode, CommuteResult } from "@/types";

/**
 * Cálculo de trayecto trabajo↔piso.
 *
 * Routing real con OpenRouteService (gratuito con API key) cuando hay
 * `ORS_API_KEY` y `MOCK_COMMUTE` no está activo. Si no, estimación heurística
 * a partir de la distancia en línea recta — así la demo funciona sin claves.
 *
 * ORS cubre coche, bici y a pie. El transporte público no está en ORS, así que
 * siempre se estima (distancia + velocidad media urbana + espera).
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

const ORS_BASE = "https://api.openrouteservice.org/v2/directions";

const ORS_PROFILE: Partial<Record<CommuteMode, string>> = {
  a_pie: "foot-walking",
  bici: "cycling-regular",
  coche: "driving-car",
};

/** Velocidades medias urbanas (km/h) para la estimación heurística. */
const SPEED_KMH: Record<CommuteMode, number> = {
  a_pie: 4.8,
  bici: 14,
  coche: 24,
  transporte: 18,
};

/** Factor línea recta → distancia real por calle. */
const DETOUR = 1.3;
const WALK_DETOUR = 1.2;
/** Espera media + transbordos del transporte público (min). */
const TRANSIT_WAIT_MIN = 6;

const DEFAULT_MODES: CommuteMode[] = ["a_pie", "bici", "transporte", "coche"];

function realRoutingEnabled(): boolean {
  return Boolean(process.env.ORS_API_KEY) && process.env.MOCK_COMMUTE !== "true";
}

/**
 * Geocodifica una dirección española con Nominatim (OpenStreetMap, sin clave).
 * Devuelve `null` si no encuentra nada o falla la red.
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number; label: string } | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        // Nominatim exige un User-Agent identificable.
        "User-Agent": "AgenteInmobiliario/1.0 (TFM; contacto via app)",
        "Accept-Language": "es",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const hit = arr?.[0];
    if (!hit) return null;
    const lat = Number.parseFloat(hit.lat);
    const lon = Number.parseFloat(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lat, lon, label: hit.display_name ?? q };
  } catch {
    return null;
  }
}

export async function computeCommute(opts: {
  origen: GeoPoint & { direccion: string };
  destino: GeoPoint & { etiqueta: string };
  modos?: CommuteMode[];
  preferido?: CommuteMode;
}): Promise<CommuteResult> {
  const { origen, destino } = opts;
  const modos = opts.modos?.length ? dedupe(opts.modos) : DEFAULT_MODES;
  const distLinea = haversineKm(origen, destino);

  const key = process.env.ORS_API_KEY;
  const real = realRoutingEnabled();
  let proveedor: CommuteResult["proveedor"] = "estimacion";

  const legs: CommuteLeg[] = [];
  for (const modo of modos) {
    let leg: CommuteLeg | null = null;
    if (real && key && ORS_PROFILE[modo]) {
      leg = await orsLeg(modo, origen, destino, key);
      if (leg) proveedor = "openrouteservice";
    }
    legs.push(leg ?? heuristicLeg(modo, distLinea));
  }

  return {
    origen: { direccion: origen.direccion, lat: origen.lat, lon: origen.lon },
    destino: { etiqueta: destino.etiqueta, lat: destino.lat, lon: destino.lon },
    distanciaLineaKm: round1(distLinea),
    modos: legs,
    recomendado: pickRecommended(legs, opts.preferido),
    proveedor,
    nota:
      proveedor === "estimacion"
        ? "Tiempos estimados a partir de la distancia (sin routing en vivo)."
        : undefined,
  };
}

async function orsLeg(
  modo: CommuteMode,
  origen: GeoPoint,
  destino: GeoPoint,
  key: string
): Promise<CommuteLeg | null> {
  const profile = ORS_PROFILE[modo];
  if (!profile) return null;
  try {
    const res = await fetch(`${ORS_BASE}/${profile}`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [origen.lon, origen.lat],
          [destino.lon, destino.lat],
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
    };
    const summary = json.routes?.[0]?.summary;
    if (!summary?.duration) return null;
    return {
      modo,
      minutos: Math.round(summary.duration / 60),
      distanciaKm: round1((summary.distance ?? 0) / 1000),
      disponible: true,
    };
  } catch {
    return null;
  }
}

function heuristicLeg(modo: CommuteMode, distLineaKm: number): CommuteLeg {
  const factor = modo === "a_pie" ? WALK_DETOUR : DETOUR;
  const roadKm = distLineaKm * factor;
  let min = (roadKm / SPEED_KMH[modo]) * 60;
  if (modo === "transporte") min += TRANSIT_WAIT_MIN;
  return {
    modo,
    minutos: Math.max(1, Math.round(min)),
    distanciaKm: round1(roadKm),
    disponible: true,
  };
}

/**
 * Modo destacado: el preferido del usuario si es válido; si no, una elección
 * sensata — andar para trayectos cortos, bici para medios, y el más rápido en
 * el resto (sin recomendar coche para ir a la vuelta de la esquina).
 */
function pickRecommended(
  legs: CommuteLeg[],
  preferido?: CommuteMode
): CommuteMode | null {
  if (preferido && legs.some((l) => l.modo === preferido && l.minutos != null)) {
    return preferido;
  }
  const by = (m: CommuteMode) => legs.find((l) => l.modo === m && l.minutos != null);
  const walk = by("a_pie");
  const bike = by("bici");
  if (walk?.minutos != null && walk.minutos <= 20) return "a_pie";
  if (bike?.minutos != null && bike.minutos <= 25) return "bici";

  const valid = legs.filter((l) => l.minutos != null);
  if (!valid.length) return null;
  return valid.reduce((best, l) => (l.minutos! < best.minutos! ? l : best)).modo;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function dedupe(modos: CommuteMode[]): CommuteMode[] {
  return Array.from(new Set(modos));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
