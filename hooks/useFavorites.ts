"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Property } from "@/types";

const LOCAL_KEY = "habitia.favorites.v1";
const LEGACY_LOCAL_KEY = "agente-inmobiliario.favorites.v1";
const LOCAL_KEYS = [LOCAL_KEY, LEGACY_LOCAL_KEY] as const;

function readLocalFavorites(): Property[] {
  for (const key of LOCAL_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as Property[];
    } catch {
      // Si una entrada está corrupta, probamos la siguiente clave compatible.
    }
  }
  return [];
}

function writeLocalFavorites(favorites: Property[]): void {
  const raw = JSON.stringify(favorites);
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.setItem(key, raw);
    } catch {
      // Conservamos la capa optimista aunque solo una de las claves sea escribible.
    }
  }
}

interface UseFavoritesOpts {
  userId?: string;
}

/**
 * Persiste en localStorage como capa optimista y sincroniza con
 * /api/favorites en background. Si Supabase no está configurado, el
 * endpoint devuelve {ok:true} sin hacer nada — el usuario ve sus favoritos
 * vivos en la sesión actual igualmente.
 */
export function useFavorites(opts: UseFavoritesOpts = {}) {
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inflight = useRef(false);

  // Carga inicial: localStorage primero (instantáneo), luego servidor (puede mergear).
  useEffect(() => {
    const local = readLocalFavorites();
    if (local.length > 0) setFavorites(local);
    // Migra y mantiene sincronizadas ambas claves sin perder datos existentes.
    writeLocalFavorites(local);
    setLoaded(true);

    let cancelled = false;
    const url = opts.userId
      ? `/api/favorites?userId=${encodeURIComponent(opts.userId)}`
      : `/api/favorites`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((data: { favorites?: Property[] }) => {
        if (cancelled) return;
        const remote = data.favorites ?? [];
        if (remote.length === 0) return;
        setFavorites((prev) => {
          const seen = new Set(prev.map((p) => p.propertyCode));
          const merged = [...prev];
          for (const p of remote) if (!seen.has(p.propertyCode)) merged.push(p);
          return merged;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [opts.userId]);

  // Persistir en localStorage tras cada cambio.
  useEffect(() => {
    if (!loaded) return;
    writeLocalFavorites(favorites);
  }, [favorites, loaded]);

  const isFavorite = useCallback(
    (propertyCode: string) => favorites.some((f) => f.propertyCode === propertyCode),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (property: Property) => {
      if (inflight.current) return;
      const exists = favorites.some((f) => f.propertyCode === property.propertyCode);
      // Optimistic update
      setFavorites((prev) =>
        exists
          ? prev.filter((p) => p.propertyCode !== property.propertyCode)
          : [property, ...prev]
      );

      inflight.current = true;
      try {
        if (exists) {
          const params = new URLSearchParams({ propertyCode: property.propertyCode });
          if (opts.userId) params.set("userId", opts.userId);
          await fetch(`/api/favorites?${params.toString()}`, { method: "DELETE" });
        } else {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: opts.userId, property }),
          });
        }
      } catch {
        // Si falla la red, revertimos.
        setFavorites((prev) =>
          exists
            ? [property, ...prev]
            : prev.filter((p) => p.propertyCode !== property.propertyCode)
        );
      } finally {
        inflight.current = false;
      }
    },
    [favorites, opts.userId]
  );

  return { favorites, isFavorite, toggleFavorite, loaded };
}
