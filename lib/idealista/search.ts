import { cachedSearch } from "./search-cache";
import { IdealistaError, ValidationError } from "@/lib/errors";
import type { Property, SearchFilters } from "@/types";
import { getAccessToken } from "./auth";
import { mockSearch } from "./mock";
import { reserveIdealistaRequest } from "./usage";
import { validateMadridSearch } from "@/lib/search-location";
import { isMadridProperty } from "@/lib/search-scope";

const BASE_URL = process.env.IDEALISTA_BASE_URL ?? "https://api.idealista.com/3.5/";

/** Radio por defecto (m) alrededor del centro cuando no se especifica `radioMetros`. */
const DEFAULT_RADIUS_M = 3500;

/**
 * Traduce el `tipo` español al `propertyType` de Idealista (+ flags asociados).
 * La doc v3.5 sólo acepta: homes, offices, premises, garages, bedrooms.
 */
function mapPropertyType(tipo?: SearchFilters["tipo"]): {
  propertyType: string;
  flags: Record<string, string>;
} {
  switch (tipo) {
    case "casas":
      // "casas" ≈ chalets en la taxonomía de Idealista.
      return { propertyType: "homes", flags: { chalet: "true" } };
    case "locales":
      return { propertyType: "premises", flags: {} };
    case "garajes":
      return { propertyType: "garages", flags: {} };
    case "pisos":
    default:
      return { propertyType: "homes", flags: {} };
  }
}

/**
 * Idealista filtra por `bedrooms` (multivaluado, separado por comas) donde "4"
 * significa "4 o más". Para "mínimo N habitaciones" devolvemos la lista N..4:
 *   2 → "2,3,4"   3 → "3,4"   4+ → "4"
 */
function bedroomsFilter(min?: number): string | null {
  if (!min || min < 1) return null;
  const capped = Math.min(Math.floor(min), 4);
  const values: number[] = [];
  for (let n = capped; n <= 4; n++) values.push(n);
  return values.join(",");
}

/**
 * Construye los parámetros del POST /search a partir de los filtros del agente.
 * Async porque puede geocodificar la zona para obtener el centro.
 */
async function buildSearchParams(
  filters: SearchFilters,
  maxItems: number,
  center: { lat: number; lon: number }
): Promise<URLSearchParams> {
  const params = new URLSearchParams();
  params.set("country", "es");
  params.set("operation", filters.operacion === "alquiler" ? "rent" : "sale");

  const { propertyType, flags } = mapPropertyType(filters.tipo);
  params.set("propertyType", propertyType);
  for (const [k, v] of Object.entries(flags)) params.set(k, v);

  params.set("locale", "es");
  params.set("maxItems", String(Math.min(Math.max(1, maxItems), 50)));
  params.set("numPage", "1");

  params.set("center", `${center.lat},${center.lon}`);
  params.set("distance", String(filters.radioMetros ?? DEFAULT_RADIUS_M));

  if (filters.precioMin) params.set("minPrice", String(filters.precioMin));
  if (filters.precioMax) params.set("maxPrice", String(filters.precioMax));
  if (filters.metrosMin) params.set("minSize", String(filters.metrosMin));
  if (filters.metrosMax) params.set("maxSize", String(filters.metrosMax));

  const bedrooms = bedroomsFilter(filters.habitaciones);
  if (bedrooms) params.set("bedrooms", bedrooms);

  return params;
}

export interface IdealistaSearchResponseElement {
  newDevelopment?: boolean;
  description?: string;
  parkingSpace?: { hasParkingSpace?: boolean };
  propertyCode: string;
  thumbnail?: string;
  url?: string;
  price: number;
  priceByArea?: number;
  size: number;
  rooms: number;
  bathrooms?: number;
  address: string;
  district?: string;
  municipality?: string;
  province?: string;
  propertyType: string;
  operation: string;
  hasLift?: boolean;
  exterior?: boolean;
  floor?: string;
  latitude?: number;
  longitude?: number;
  detailedType?: { typology?: string; subTypology?: string };
}

export function normalizeProperty(
  raw: IdealistaSearchResponseElement,
  op: SearchFilters["operacion"]
): Property {
  const city = raw.municipality ?? raw.district ?? "";
  const district = raw.district ?? "";
  const rooms = typeof raw.rooms === "number" && Number.isFinite(raw.rooms) ? raw.rooms : undefined;
  const sizeLabel = raw.size ? `${raw.size} m²` : "";
  const title = [
    raw.detailedType?.typology ?? "Vivienda",
    rooms ? `de ${rooms} hab.` : "",
    district ? `en ${district}` : city ? `en ${city}` : "",
    sizeLabel ? `· ${sizeLabel}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    propertyCode: raw.propertyCode,
    title,
    price: raw.price,
    newDevelopment: typeof raw.newDevelopment === "boolean" ? raw.newDevelopment : undefined,
    pricePerSqm: raw.priceByArea,
    description: typeof raw.description === "string" ? raw.description.slice(0, 12000) : undefined,
    parkingSpace: typeof raw.parkingSpace?.hasParkingSpace === "boolean"
      ? { hasParkingSpace: raw.parkingSpace.hasParkingSpace } : undefined,
    size: raw.size,
    rooms,
    bathrooms: raw.bathrooms,
    address: raw.address,
    district: raw.district,
    municipality: raw.municipality,
    province: raw.province,
    propertyType: raw.propertyType,
    detailedType: raw.detailedType,
    sourceKind: "idealista",
    operation: op === "alquiler" ? "rent" : "sale",
    thumbnail: raw.thumbnail || "/property-unavailable.svg",
    url: raw.url ?? `https://www.idealista.com/inmueble/${raw.propertyCode}/`,
    hasLift: raw.hasLift,
    exterior: raw.exterior,
    floor: raw.floor,
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

const SEARCH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/x-www-form-urlencoded",
});

export async function searchProperties(
  filters: SearchFilters,
  maxItems = 6
): Promise<Property[]> {
  if (typeof filters.zona !== "string" || filters.zona.length > 200 || !["venta", "alquiler"].includes(filters.operacion)
    || [filters.precioMin, filters.precioMax, filters.metrosMin, filters.metrosMax, filters.habitaciones].some((v) => v !== undefined && (!Number.isFinite(v) || v < 0))) throw new ValidationError("invalid search filters", "Revisa la zona, la operación y los límites numéricos de la búsqueda.");
  maxItems = Math.max(1, Math.min(24, Math.floor(maxItems)));
  const center = await validateMadridSearch(filters);
  if (process.env.MOCK_IDEALISTA === "true") {
    return mockSearch(filters, maxItems).filter(isMadridProperty).map((p) => ({ ...p, sourceKind: "demo" as const }));
  }

  const params = await buildSearchParams(filters, maxItems, center);
  const url = `${BASE_URL.replace(/\/$/, "")}/es/search`;

  const properties = await cachedSearch(params.toString(), async () => {
  const token = await getAccessToken();
  await reserveIdealistaRequest();
  const res = await fetch(url, {
    method: "POST",
    headers: SEARCH_HEADERS(token),
    body: params.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new IdealistaError(
      `search failed ${res.status}: ${body.slice(0, 300)}`,
      { status: res.status }
    );
  }

  const data = (await res.json()) as { elementList?: IdealistaSearchResponseElement[] };
  const list = data.elementList ?? [];
  return list.map((el) => normalizeProperty(el, filters.operacion));
  });
  return properties.filter(isMadridProperty);
}
