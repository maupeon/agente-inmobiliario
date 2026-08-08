"use client";
import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/types";

const KEY = "habitia:profile:v1";
const LEGACY_KEY = "agente-inmobiliario:profile:v1";
const STORAGE_KEYS = [KEY, LEGACY_KEY] as const;

function readStoredProfile(): UserProfile | null {
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as UserProfile;
    } catch {
      // Si una entrada está corrupta, probamos la siguiente clave compatible.
    }
  }
  return null;
}

function writeStoredProfile(profile: UserProfile): void {
  const raw = JSON.stringify(profile);
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.setItem(key, raw);
    } catch {
      // La copia que sí quepa o esté disponible seguirá manteniendo el perfil.
    }
  }
}

/**
 * Perfil del inquilino persistido en localStorage (no hay auth). `loaded`
 * indica que ya hemos leído el almacenamiento, para no parpadear el onboarding.
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = readStoredProfile();
    if (stored) {
      setProfile(stored);
      // Sincroniza la clave nueva y la antigua para conservar compatibilidad.
      writeStoredProfile(stored);
    }
    setLoaded(true);
  }, []);

  const save = useCallback((p: UserProfile) => {
    setProfile(p);
    writeStoredProfile(p);
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    for (const key of STORAGE_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        // no-op
      }
    }
  }, []);

  return { profile, loaded, save, clear };
}
