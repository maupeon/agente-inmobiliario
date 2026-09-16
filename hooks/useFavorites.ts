"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { demoRequest, DEMO_FAVORITES_CHANGED } from "@/lib/shared-demo";
import type { Property } from "@/types";
/** Lista global de la demo: se actualiza al guardar, al volver y cada 30 s. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mutationRef = useRef(false);
  const favoritesRef = useRef<Property[]>([]);
  const requestRef = useRef(0);
  const alive = useRef(false);
  const refresh = useCallback(async () => {
    if (mutationRef.current) return;
    const request = ++requestRef.current;
    try {
      const data = await demoRequest<{ favorites: Property[] }>("/api/favorites");
      if (!alive.current || request !== requestRef.current) return;
      favoritesRef.current = data.favorites;
      setFavorites(data.favorites);
      setError(null);
    } catch (e) {
      if (alive.current && request === requestRef.current) setError(e instanceof Error ? e.message : "No se pudieron cargar los favoritos compartidos.");
    } finally {
      if (alive.current && request === requestRef.current) setLoaded(true);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const sync = () => { void refresh(); };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener(DEMO_FAVORITES_CHANGED, sync);
    const timer = setInterval(sync, 30_000);
    const requests = requestRef;
    return () => {
      alive.current = false;
      requests.current++;
      window.removeEventListener("focus", sync);
      window.removeEventListener(DEMO_FAVORITES_CHANGED, sync);
      clearInterval(timer);
    };
  }, [refresh]);
  const isFavorite = useCallback((code: string) => favorites.some((p) => p.propertyCode === code), [favorites]);
  const toggleFavorite = useCallback(async (property: Property) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    requestRef.current++;
    setSaving(true);
    setError(null);
    const remove = favoritesRef.current.some((p) => p.propertyCode === property.propertyCode);
    try {
      await demoRequest("/api/favorites", {
        method: remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remove ? { propertyCode: property.propertyCode } : { property }),
      });
      const next = remove ? favoritesRef.current.filter((p) => p.propertyCode !== property.propertyCode) : [property, ...favoritesRef.current.filter((p) => p.propertyCode !== property.propertyCode)].slice(0, 100);
      favoritesRef.current = next;
      if (alive.current) setFavorites(next);
      window.dispatchEvent(new Event(DEMO_FAVORITES_CHANGED));
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "No se pudo guardar el cambio en Supabase.");
    } finally {
      mutationRef.current = false;
      if (alive.current) setSaving(false);
    }
  }, []);
  return { favorites, isFavorite, toggleFavorite, loaded, error, saving, refresh };
}
