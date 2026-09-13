import { isRecord } from "@/lib/api-validation";
import { ValidationError } from "@/lib/errors";
import { valorarLoteConEstado } from "@/lib/valoracion/client";
import type { Property, PurchaseValuation } from "@/types";
/** Solo usa campos observados; la operación nunca se convierte de alquiler a venta. */
export async function runValorarVivienda(input: unknown): Promise<PurchaseValuation> {
  if (!isRecord(input) || typeof input.propertyCode !== "string" || input.propertyCode.length > 80
    || typeof input.municipality !== "string" || typeof input.propertyType !== "string"
    || !["sale", "rent"].includes(String(input.operation))
    || ![input.latitude, input.longitude, input.size, input.price].every(Number.isFinite)
    || Number(input.price) <= 0) throw new ValidationError("invalid valuation input", "Para valorar hacen falta los datos observados del anuncio: operación, precio, superficie, municipio, tipo y coordenadas.");
  const p: Property = {
    propertyCode: input.propertyCode, price: Number(input.price), size: Number(input.size),
    rooms: Number.isFinite(input.rooms) ? Number(input.rooms) : undefined,
    bathrooms: Number.isFinite(input.bathrooms) ? Number(input.bathrooms) : undefined,
    municipality: input.municipality, propertyType: input.propertyType, operation: input.operation as "sale" | "rent",
    latitude: Number(input.latitude), longitude: Number(input.longitude),
    floor: typeof input.floor === "string" ? input.floor : undefined,
    hasLift: typeof input.hasLift === "boolean" ? input.hasLift : undefined,
    exterior: typeof input.exterior === "boolean" ? input.exterior : undefined,
    description: typeof input.description === "string" ? input.description.slice(0, 12000) : undefined,
    parkingSpace: isRecord(input.parkingSpace) && typeof input.parkingSpace.hasParkingSpace === "boolean"
      ? { hasParkingSpace: input.parkingSpace.hasParkingSpace } : undefined,
    detailedType: isRecord(input.detailedType) ? {
      typology: typeof input.detailedType.typology === "string" ? input.detailedType.typology : undefined,
      subTypology: typeof input.detailedType.subTypology === "string" ? input.detailedType.subTypology : undefined,
    } : undefined,
    sourceKind: input.sourceKind === "demo" ? "demo" : "idealista",
    title: "Anuncio consultado", address: "", thumbnail: "", url: "",
  };
  const batch = await valorarLoteConEstado([p], { explicar: true });
  const state = batch.estados.get(p.propertyCode);
  return { propertyCode: p.propertyCode, operation: p.operation, resultado: batch.resultados.get(p.propertyCode) ?? null,
    estado: state?.estado ?? "no_disponible", aviso: state?.motivo ?? "Sin resultado del modelo.", sourceKind: p.sourceKind };
}
