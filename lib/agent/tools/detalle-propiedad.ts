import { ValidationError } from "@/lib/errors";
import { getPropertyDetail } from "@/lib/idealista/property";
import type { PropertyDetail } from "@/types";

export interface DetallePropiedadInput {
  propertyCode: string;
}

export interface DetallePropiedadResult {
  propertyCode: string;
  title: string;
  price: number;
  pricePerSqm?: number;
  size: number;
  rooms: number;
  bathrooms?: number;
  address?: string;
  district?: string;
  municipality?: string;
  description: string;
  features: string[];
  energyCertification?: string;
  yearBuilt?: number;
  url: string;
  photos: string[];
  /** Igual que photos pero para que el cliente lo dibuje en la UI. */
  property: PropertyDetail;
}

export async function runDetallePropiedad(
  input: DetallePropiedadInput
): Promise<DetallePropiedadResult> {
  if (!input?.propertyCode)
    throw new ValidationError("propertyCode es obligatorio");

  const detail = await getPropertyDetail(input.propertyCode);

  return {
    propertyCode: detail.propertyCode,
    title: detail.title,
    price: detail.price,
    pricePerSqm: detail.pricePerSqm,
    size: detail.size,
    rooms: detail.rooms,
    bathrooms: detail.bathrooms,
    address: detail.address,
    district: detail.district,
    municipality: detail.municipality,
    description: detail.description,
    features: detail.features,
    energyCertification: detail.energyCertification,
    yearBuilt: detail.yearBuilt,
    url: detail.url,
    photos: detail.photos,
    property: detail,
  };
}
