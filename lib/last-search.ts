import type { Property, PropertyRecommendation, SearchFilters } from "@/types";

const KEY = "habitia:lastSearch:v1";
const LEGACY_KEY = "agente-inmobiliario:lastSearch:v1";
const STORAGE_KEYS = [KEY, LEGACY_KEY] as const;
export const LAST_SEARCH_EVENT = "habitia:last-search-updated";

/** Instantánea local de los resultados; no demuestra disponibilidad actual. */
export interface LastSearch {
  properties: Property[];
  savedAt: string | null;
  filters?: SearchFilters | null;
  recommendations?: PropertyRecommendation[];
  source?: "chat" | "dashboard";
}
function writeStoredSearch(search: LastSearch): boolean {
  const raw = JSON.stringify(search);
  let written = false;
  for (const key of STORAGE_KEYS) {
    try { localStorage.setItem(key, raw); written = true; } catch { /* Se informa al consumidor si falla toda copia. */ }
  }
  return written;
}
export function saveLastSearch(properties: Property[], metadata: Omit<LastSearch, "properties" | "savedAt"> = {}): boolean {
  if (typeof window === "undefined") return false;
  // Un resultado vacío sustituye la búsqueda anterior: nunca resucitar pisos obsoletos.
  const written = writeStoredSearch({ ...metadata, properties, savedAt: new Date().toISOString() });
  window.dispatchEvent(new Event(LAST_SEARCH_EVENT));
  return written;
}
export function readLastSearch(): LastSearch {
  if (typeof window === "undefined") return { properties: [], savedAt: null };
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<LastSearch>;
      if (!parsed || !Array.isArray(parsed.properties)) continue;
      const properties = parsed.properties.filter((p) => p && typeof p.propertyCode === "string" && typeof p.title === "string" && Number.isFinite(p.price) && Number.isFinite(p.size));
      const search: LastSearch = {
        properties,
        savedAt: typeof parsed.savedAt === "string" && Number.isFinite(Date.parse(parsed.savedAt)) ? parsed.savedAt : null,
        source: parsed.source === "dashboard" ? "dashboard" : "chat",
        filters: parsed.filters && typeof parsed.filters.zona === "string" && ["alquiler", "venta"].includes(parsed.filters.operacion) ? parsed.filters : null,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.filter((r) => r?.property && properties.some((p) => p.propertyCode === r.property.propertyCode) && r.enrichment && Number.isFinite(r.score)) : undefined,
      };
      writeStoredSearch(search);
      return search;
    } catch { /* Prueba la siguiente clave si esta está corrupta. */ }
  }
  return { properties: [], savedAt: null };
}
