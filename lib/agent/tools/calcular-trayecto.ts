import { ValidationError } from "@/lib/errors";
import { computeCommute, geocodeAddress, type GeoPoint } from "@/lib/commute";
import { lookupPlace } from "@/lib/commute/places";
import type { CommuteMode, CommuteResult } from "@/types";

const MODES: CommuteMode[] = ["a_pie", "bici", "coche", "transporte"];

export interface CalcularTrayectoInput {
  /** Dirección o etiqueta del lugar de trabajo (origen). */
  origenDireccion: string;
  origenLat?: number;
  origenLon?: number;
  /** Zona, barrio o dirección de la vivienda (destino). */
  destino: string;
  destinoLat?: number;
  destinoLon?: number;
  modos?: CommuteMode[];
  modoPreferido?: CommuteMode;
}

export async function runCalcularTrayecto(
  input: CalcularTrayectoInput
): Promise<CommuteResult> {
  if (!input?.origenDireccion && input?.origenLat == null)
    throw new ValidationError("falta el origen (lugar de trabajo)");
  if (!input?.destino && input?.destinoLat == null)
    throw new ValidationError("falta el destino (la vivienda)");

  const origen = await resolve(input.origenDireccion, input.origenLat, input.origenLon);
  if (!origen) {
    throw new ValidationError(
      "no he podido localizar el lugar de trabajo",
      "No he conseguido ubicar tu lugar de trabajo en el mapa. ¿Puedes darme una dirección más concreta?"
    );
  }

  const destino = await resolve(input.destino, input.destinoLat, input.destinoLon);
  if (!destino) {
    throw new ValidationError(
      "no he podido localizar el destino",
      "No he conseguido ubicar esa zona en el mapa. Prueba con el nombre del barrio y la ciudad."
    );
  }

  const modos = input.modos?.length
    ? input.modos.filter((m) => MODES.includes(m))
    : MODES;

  return computeCommute({
    origen: { ...origen.point, direccion: input.origenDireccion || origen.label },
    destino: { ...destino.point, etiqueta: input.destino || destino.label },
    modos: modos.length ? modos : MODES,
    preferido: input.modoPreferido,
  });
}

/** Resuelve coordenadas: explícitas → gazetteer → geocodificación. */
async function resolve(
  text: string | undefined,
  lat?: number,
  lon?: number
): Promise<{ point: GeoPoint; label: string } | null> {
  if (lat != null && lon != null) {
    return { point: { lat, lon }, label: text ?? `${lat},${lon}` };
  }
  if (!text) return null;

  const local = lookupPlace(text);
  if (local) return { point: local, label: text };

  const geo = await geocodeAddress(text);
  if (geo) return { point: { lat: geo.lat, lon: geo.lon }, label: geo.label };

  return null;
}
