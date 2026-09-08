"use client";
import { useCallback, useEffect, useState } from "react";
import type { Property } from "@/types";
const KEY = "habitia.favorites.v1";
const LEGACY_KEY = "agente-inmobiliario.favorites.v1";
const CHANGED = "habitia-favorites-changed";
function read(): Property[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((p) => p && typeof p.propertyCode === "string") : [];
  } catch { return []; }
}
/** Favoritos de este perfil del navegador; no se sincronizan al servidor. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const sync = () => setFavorites(read());
    sync(); setLoaded(true);
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGED, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(CHANGED, sync); };
  }, []);
  const isFavorite = useCallback((code: string) => favorites.some((p) => p.propertyCode === code), [favorites]);
  const toggleFavorite = useCallback(async (property: Property) => {
    const current = read();
    const next = current.some((p) => p.propertyCode === property.propertyCode)
      ? current.filter((p) => p.propertyCode !== property.propertyCode)
      : [property, ...current].slice(0, 100);
    setFavorites(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      localStorage.removeItem(LEGACY_KEY);
      window.dispatchEvent(new Event(CHANGED));
    } catch { /* Permanece en memoria si el navegador bloquea almacenamiento. */ }
  }, []);
  return { favorites, isFavorite, toggleFavorite, loaded };
}
