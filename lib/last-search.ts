import type { Property } from "@/types";

/**
 * Última búsqueda mostrada en el chat, persistida en localStorage para que el
 * panel/mapa pueda pintarla aunque el usuario navegue fuera del chat. No hay
 * servidor de por medio: los resultados de búsqueda no se guardan en Supabase.
 */
const KEY = "habitia:lastSearch:v1";
const LEGACY_KEY = "agente-inmobiliario:lastSearch:v1";
const STORAGE_KEYS = [KEY, LEGACY_KEY] as const;

export interface LastSearch {
  properties: Property[];
  savedAt: string | null;
}

function writeStoredSearch(search: LastSearch): void {
  const raw = JSON.stringify(search);
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.setItem(key, raw);
    } catch {
      // La búsqueda sigue disponible si al menos una clave pudo persistirse.
    }
  }
}

export function saveLastSearch(properties: Property[]): void {
  if (typeof window === "undefined" || properties.length === 0) return;
  writeStoredSearch({ properties, savedAt: new Date().toISOString() });
}

export function readLastSearch(): LastSearch {
  if (typeof window === "undefined") return { properties: [], savedAt: null };
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<LastSearch>;
      const search = {
        properties: Array.isArray(parsed.properties) ? parsed.properties : [],
        savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : null,
      };
      // Migra y mantiene sincronizadas ambas claves sin romper sesiones anteriores.
      writeStoredSearch(search);
      return search;
    } catch {
      // Si una entrada está corrupta, probamos la siguiente clave compatible.
    }
  }
  return { properties: [], savedAt: null };
}
