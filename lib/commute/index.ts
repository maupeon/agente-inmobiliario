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

/**
 * Perfil ORS para DIBUJAR el trayecto en el mapa. El transporte público no
 * existe en ORS, así que su ruta se aproxima por carretera (coche) para que el
 * trayecto siga las calles y no salga en línea recta.
 */
const GEOMETRY_PROFILE: Record<CommuteMode, string> = {
  a_pie: "foot-walking",
  bici: "cycling-regular",
  coche: "driving-car",
  transporte: "driving-car",
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
        "User-Agent": "HabitIA/1.0 (TFM; contacto via app)",
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

/**
 * Geocodificación inversa: coordenadas → etiqueta legible (barrio, ciudad).
 * Usa Nominatim (sin clave). La usa el selector de mapa del onboarding.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ label: string } | null> {
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse" +
      `?format=jsonv2&zoom=14&addressdetails=1&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "HabitIA/1.0 (TFM; contacto via app)",
        "Accept-Language": "es",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = json.address ?? {};
    const barrio =
      a.neighbourhood || a.suburb || a.quarter || a.city_district || a.borough;
    const ciudad =
      a.city || a.town || a.village || a.municipality || a.county;
    const label =
      barrio && ciudad
        ? `${barrio}, ${ciudad}`
        : ciudad ||
          barrio ||
          json.display_name?.split(",").slice(0, 2).join(",").trim() ||
          `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    return { label };
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
  const geomByMode = new Map<CommuteMode, Array<[number, number]>>();
  for (const modo of modos) {
    let leg: CommuteLeg | null = null;
    if (real && key && ORS_PROFILE[modo]) {
      const r = await orsLeg(modo, origen, destino, key);
      if (r) {
        leg = r.leg;
        proveedor = "openrouteservice";
        if (r.geometria) geomByMode.set(modo, r.geometria);
      }
    }
    legs.push(leg ?? heuristicLeg(modo, distLinea));
  }

  const recomendado = pickRecommended(legs, opts.preferido);

  // Geometría del trayecto recomendado para pintarlo en el mapa.
  let geometria = recomendado ? geomByMode.get(recomendado) : undefined;
  // Si el modo recomendado no trae geometría (típico del transporte público),
  // pedimos una ruta por carretera como aproximación para no pintar una recta.
  if (!geometria && real && key && recomendado) {
    const coords = await orsRouteGeometry(GEOMETRY_PROFILE[recomendado], origen, destino, key);
    if (coords) geometria = coords;
  }
  const rutaGeo: CommuteResult["rutaGeo"] = {
    geometria:
      geometria ??
      ([
        [origen.lon, origen.lat],
        [destino.lon, destino.lat],
      ] as Array<[number, number]>),
    aprox: !geometria,
  };

  return {
    origen: { direccion: origen.direccion, lat: origen.lat, lon: origen.lon },
    destino: { etiqueta: destino.etiqueta, lat: destino.lat, lon: destino.lon },
    distanciaLineaKm: round1(distLinea),
    modos: legs,
    recomendado,
    proveedor,
    rutaGeo,
    nota:
      proveedor === "estimacion"
        ? "Tiempos estimados a partir de la distancia (sin routing en vivo)."
        : undefined,
  };
}

interface OrsRoute {
  duration: number;
  distance: number;
  coords: Array<[number, number]> | null;
}

/**
 * Llama al endpoint `/geojson` de ORS, que devuelve la geometría de la ruta
 * (LineString) además del resumen — base tanto del tiempo como del trazado.
 */
async function orsGeojson(
  profile: string,
  origen: GeoPoint,
  destino: GeoPoint,
  key: string
): Promise<OrsRoute | null> {
  try {
    const res = await fetch(`${ORS_BASE}/${profile}/geojson`, {
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
      features?: Array<{
        properties?: { summary?: { distance?: number; duration?: number } };
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    };
    const feat = json.features?.[0];
    const summary = feat?.properties?.summary;
    if (!summary?.duration) return null;
    const coords = feat?.geometry?.coordinates ?? null;
    return {
      duration: summary.duration,
      distance: summary.distance ?? 0,
      coords: coords && coords.length > 1 ? coords : null,
    };
  } catch {
    return null;
  }
}

async function orsLeg(
  modo: CommuteMode,
  origen: GeoPoint,
  destino: GeoPoint,
  key: string
): Promise<{ leg: CommuteLeg; geometria: Array<[number, number]> | null } | null> {
  const profile = ORS_PROFILE[modo];
  if (!profile) return null;
  const r = await orsGeojson(profile, origen, destino, key);
  if (!r) return null;
  return {
    leg: {
      modo,
      minutos: Math.round(r.duration / 60),
      distanciaKm: round1(r.distance / 1000),
      disponible: true,
    },
    geometria: r.coords,
  };
}

/** Solo la geometría (para trayectos sin routing propio, p. ej. transporte). */
async function orsRouteGeometry(
  profile: string,
  origen: GeoPoint,
  destino: GeoPoint,
  key: string
): Promise<Array<[number, number]> | null> {
  const r = await orsGeojson(profile, origen, destino, key);
  return r?.coords ?? null;
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
