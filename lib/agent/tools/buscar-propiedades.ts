import { ValidationError } from "@/lib/errors";
import { searchProperties } from "@/lib/idealista/search";
import type { Property, SearchFilters } from "@/types";

export interface BuscarPropiedadesInput {
  zona: string;
  operacion: "venta" | "alquiler";
  tipo?: "pisos" | "casas" | "locales" | "garajes";
  precioMin?: number;
  precioMax?: number;
  metrosMin?: number;
  habitaciones?: number;
}

export interface BuscarPropiedadesResult {
  count: number;
  procedencia: "demo_ficticia" | "idealista";
  filters: SearchFilters;
  /** Resumen plano que Claude puede leer y comentar al usuario. */
  summary: Array<{
    propertyCode: string;
    operation: Property["operation"];
    bathrooms?: number;
    description?: string;
    parkingSpace?: Property["parkingSpace"];
    newDevelopment?: boolean;
    title: string;
    price: number;
    pricePerSqm?: number;
    size: number;
    rooms?: number;
    district?: string;
    municipality?: string;
    floor?: string;
    hasLift?: boolean;
    exterior?: boolean;
    url: string;
    latitude?: number; longitude?: number; propertyType: string; detailedType?: Property["detailedType"]; sourceKind?: Property["sourceKind"];
  }>;
  /** Para enriquecer el chunk de stream del cliente; no lo lee Claude. */
  properties: Property[];
}

export async function runBuscarPropiedades(
  input: BuscarPropiedadesInput
): Promise<BuscarPropiedadesResult> {
  if (typeof input?.zona !== "string" || !input.zona.trim() || input.zona.length > 180) throw new ValidationError("zona es obligatoria");
  if (!["venta", "alquiler"].includes(input?.operacion)) throw new ValidationError("operacion es obligatoria");

  const filters: SearchFilters = {
    zona: input.zona,
    operacion: input.operacion,
    tipo: input.tipo ?? "pisos",
    precioMin: input.precioMin,
    precioMax: input.precioMax,
    metrosMin: input.metrosMin,
    habitaciones: input.habitaciones,
  };

  const properties = await searchProperties(filters, 6);

  return {
    count: properties.length,
    procedencia: process.env.MOCK_IDEALISTA === "true" ? "demo_ficticia" : "idealista",
    filters,
    summary: properties.map((p) => ({
      propertyCode: p.propertyCode,
      operation: p.operation, bathrooms: p.bathrooms, description: p.description,
      parkingSpace: p.parkingSpace, newDevelopment: p.newDevelopment,
      latitude: p.latitude, longitude: p.longitude, propertyType: p.propertyType, detailedType: p.detailedType, sourceKind: p.sourceKind,
      title: p.title,
      price: p.price,
      pricePerSqm: p.pricePerSqm,
      size: p.size,
      rooms: p.rooms,
      district: p.district,
      municipality: p.municipality,
      floor: p.floor,
      hasLift: p.hasLift,
      exterior: p.exterior,
      url: p.url,
    })),
    properties,
  };
}
