import { IdealistaError } from "@/lib/errors";
import type { PropertyDetail } from "@/types";
import { getAccessToken } from "./auth";
import { mockDetail } from "./mock";

const BASE_URL = process.env.IDEALISTA_BASE_URL ?? "https://api.idealista.com/3.5/";

interface IdealistaDetailResponse {
  propertyCode: string;
  url?: string;
  thumbnail?: string;
  multimedia?: { images?: Array<{ url: string; tag?: string }> };
  propertyComment?: string;
  price: number;
  priceByArea?: number;
  size: number;
  rooms: number;
  bathrooms?: number;
  address?: string;
  district?: string;
  municipality?: string;
  province?: string;
  propertyType: string;
  operation: string;
  hasLift?: boolean;
  exterior?: boolean;
  floor?: string;
  energyCertification?: { rating?: string };
  yearBuilt?: number;
  features?: string[];
  detailedType?: { typology?: string };
}

export async function getPropertyDetail(propertyCode: string): Promise<PropertyDetail> {
  if (process.env.MOCK_IDEALISTA === "true") {
    return mockDetail(propertyCode);
  }

  const token = await getAccessToken();
  const url = `${BASE_URL.replace(/\/$/, "")}/es/detail/${encodeURIComponent(propertyCode)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new IdealistaError(
      `detail failed ${res.status}: ${body.slice(0, 300)}`,
      { status: res.status }
    );
  }

  const raw = (await res.json()) as IdealistaDetailResponse;
  const photos = (raw.multimedia?.images ?? []).slice(0, 5).map((i) => i.url);
  const op: PropertyDetail["operation"] = raw.operation === "rent" ? "rent" : "sale";

  return {
    propertyCode: raw.propertyCode,
    title: `${raw.detailedType?.typology ?? raw.propertyType ?? "Vivienda"} en ${raw.district ?? raw.municipality ?? ""}`,
    price: raw.price,
    pricePerSqm: raw.priceByArea,
    size: raw.size,
    rooms: raw.rooms,
    bathrooms: raw.bathrooms,
    address: raw.address ?? "",
    district: raw.district,
    municipality: raw.municipality,
    province: raw.province,
    propertyType: raw.propertyType,
    operation: op,
    thumbnail: raw.thumbnail ?? photos[0] ?? `https://picsum.photos/seed/${propertyCode}/800/600`,
    url: raw.url ?? `https://www.idealista.com/inmueble/${propertyCode}/`,
    hasLift: raw.hasLift,
    exterior: raw.exterior,
    floor: raw.floor,
    description: raw.propertyComment ?? "",
    photos: photos.length > 0 ? photos : [`https://picsum.photos/seed/${propertyCode}/1280/860`],
    features: raw.features ?? [],
    energyCertification: raw.energyCertification?.rating,
    yearBuilt: raw.yearBuilt,
  };
}
