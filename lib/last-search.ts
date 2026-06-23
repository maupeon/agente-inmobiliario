import type { Property } from "@/types";

/**
 * Última búsqueda mostrada en el chat, persistida en localStorage para que el
 * panel/mapa pueda pintarla aunque el usuario navegue fuera del chat. No hay
 * servidor de por medio: los resultados de búsqueda no se guardan en Supabase.
 */
const KEY = "agente-inmobiliario:lastSearch:v1";

export interface LastSearch {
  properties: Property[];
  savedAt: string | null;
}

export function saveLastSearch(properties: Property[]): void {
  if (typeof window === "undefined" || properties.length === 0) return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ properties, savedAt: new Date().toISOString() })
    );
  } catch {
    // localStorage lleno o no disponible: la búsqueda sigue viva en la sesión.
  }
}

export function readLastSearch(): LastSearch {
  if (typeof window === "undefined") return { properties: [], savedAt: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { properties: [], savedAt: null };
    const parsed = JSON.parse(raw) as Partial<LastSearch>;
    return { properties: parsed.properties ?? [], savedAt: parsed.savedAt ?? null };
  } catch {
    return { properties: [], savedAt: null };
  }
}
