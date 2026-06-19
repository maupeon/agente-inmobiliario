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
  filters: SearchFilters;
  /** Resumen plano que Claude puede leer y comentar al usuario. */
  summary: Array<{
    propertyCode: string;
    title: string;
    price: number;
    pricePerSqm?: number;
    size: number;
    rooms: number;
    district?: string;
    municipality?: string;
    floor?: string;
    hasLift?: boolean;
    exterior?: boolean;
    url: string;
  }>;
  /** Para enriquecer el chunk de stream del cliente; no lo lee Claude. */
  properties: Property[];
}

export async function runBuscarPropiedades(
  input: BuscarPropiedadesInput
): Promise<BuscarPropiedadesResult> {
  if (!input?.zona) throw new ValidationError("zona es obligatoria");
  if (!input?.operacion) throw new ValidationError("operacion es obligatoria");

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
    filters,
    summary: properties.map((p) => ({
      propertyCode: p.propertyCode,
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
