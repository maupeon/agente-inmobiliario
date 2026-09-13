import "server-only";
import { geocodeAddress } from "@/lib/commute";
import { lookupMadridPlace } from "@/lib/commute/places";
import { ValidationError } from "@/lib/errors";
import { isMadridPoint, MADRID_SCOPE_MESSAGE } from "./search-scope";
import type { SearchFilters } from "@/types";

export async function resolveMadridLocation(query: string) {
  const q = query.trim();
  if (!q || q.length > 200) throw new ValidationError("invalid search location", "Escribe un barrio o una dirección de Madrid.");
  // Coincidencias exactas: una mención a Madrid o un barrio no basta para
  // aceptar textos contradictorios como «Chamberí Barcelona».
  const local = lookupMadridPlace(q);
  const coordinates = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  const result = local ? { ...local, label: /madrid/i.test(q) ? q : `${q}, Madrid` }
    : coordinates ? { lat: Number(coordinates[1]), lon: Number(coordinates[2]), label: q }
    : await geocodeAddress(q);
  if (!result) throw new ValidationError("unresolved search location", "No he conseguido situar esa zona. Escribe un barrio o una dirección de Madrid capital.");
  if (!isMadridPoint(result.lat, result.lon)) throw new ValidationError("outside Madrid", MADRID_SCOPE_MESSAGE);
  return result;
}

export async function validateMadridSearch(filters: SearchFilters) {
  // No se aceptan identificadores territoriales opacos que eludan el centro.
  if (filters.locationId) throw new ValidationError("unsupported locationId", MADRID_SCOPE_MESSAGE);
  if (filters.centro && !isMadridPoint(filters.centro.lat, filters.centro.lon)) throw new ValidationError("outside Madrid center", MADRID_SCOPE_MESSAGE);
  if (filters.radioMetros !== undefined && (!Number.isFinite(filters.radioMetros) || filters.radioMetros <= 0 || filters.radioMetros > 60000)) {
    throw new ValidationError("invalid radius", "El radio de búsqueda debe estar entre 1 y 60.000 metros.");
  }
  // Se comprueba el texto aunque haya un pin o un perfil guardado.
  const location = await resolveMadridLocation(filters.zona);
  return filters.centro ?? { lat: location.lat, lon: location.lon };
}
