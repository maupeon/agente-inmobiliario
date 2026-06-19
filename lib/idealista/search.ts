import { IdealistaError } from "@/lib/errors";
import type { Property, SearchFilters } from "@/types";
import { getAccessToken } from "./auth";
import { mockSearch } from "./mock";

const BASE_URL = process.env.IDEALISTA_BASE_URL ?? "https://api.idealista.com/3.5/";

/**
 * Mapea el filtro español que usa el agente al payload que espera Idealista.
 * Documentación: https://developers.idealista.com/access-request
 */
function mapFilters(filters: SearchFilters, maxItems: number) {
  const params = new URLSearchParams();
  params.set("country", "es");
  params.set("operation", filters.operacion === "alquiler" ? "rent" : "sale");
  params.set("propertyType", "homes");
  params.set("locale", "es");
  params.set("maxItems", String(maxItems));
  params.set("numPage", "1");
  params.set("locationName", filters.zona);

  if (filters.precioMin) params.set("minPrice", String(filters.precioMin));
  if (filters.precioMax) params.set("maxPrice", String(filters.precioMax));
  if (filters.metrosMin) params.set("minSize", String(filters.metrosMin));
  if (filters.metrosMax) params.set("maxSize", String(filters.metrosMax));
  if (filters.habitaciones) params.set("minRooms", String(filters.habitaciones));

  return params;
}

interface IdealistaSearchResponseElement {
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

function normalizeProperty(raw: IdealistaSearchResponseElement, op: SearchFilters["operacion"]): Property {
  const city = raw.municipality ?? raw.district ?? "";
  const district = raw.district ?? "";
  const rooms = raw.rooms ?? 0;
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
    pricePerSqm: raw.priceByArea,
    size: raw.size,
    rooms,
    bathrooms: raw.bathrooms,
    address: raw.address,
    district: raw.district,
    municipality: raw.municipality,
    province: raw.province,
    propertyType: raw.propertyType,
    operation: op === "alquiler" ? "rent" : "sale",
    thumbnail: raw.thumbnail ?? `https://picsum.photos/seed/${raw.propertyCode}/800/600`,
    url: raw.url ?? `https://www.idealista.com/inmueble/${raw.propertyCode}/`,
    hasLift: raw.hasLift,
    exterior: raw.exterior,
    floor: raw.floor,
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

export async function searchProperties(
  filters: SearchFilters,
  maxItems = 6
): Promise<Property[]> {
  if (process.env.MOCK_IDEALISTA === "true") {
    return mockSearch(filters, maxItems);
  }

  const token = await getAccessToken();
  const params = mapFilters(filters, maxItems);
  const url = `${BASE_URL.replace(/\/$/, "")}/es/search`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
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
}
