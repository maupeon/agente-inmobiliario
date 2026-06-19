"use client";
import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/types";

const KEY = "agente-inmobiliario:profile:v1";

/**
 * Perfil del inquilino persistido en localStorage (no hay auth). `loaded`
 * indica que ya hemos leído el almacenamiento, para no parpadear el onboarding.
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(JSON.parse(raw) as UserProfile);
    } catch {
      // localStorage no disponible / JSON corrupto: arrancamos sin perfil.
    }
    setLoaded(true);
  }, []);

  const save = useCallback((p: UserProfile) => {
    setProfile(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Ignoramos: el perfil sigue vivo en memoria durante la sesión.
    }
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      // no-op
    }
  }, []);

  return { profile, loaded, save, clear };
}
