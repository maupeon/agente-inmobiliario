import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con `service_role` para escrituras desde API routes.
 * Solo se importa desde código de servidor.
 */
let cached: SupabaseClient | null | undefined;

export function getServerSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js parchea `fetch` y cachea por defecto las respuestas (Data Cache),
      // lo que devolvía conteos/lecturas obsoletas desde PostgREST. El cliente de
      // servicio siempre quiere datos frescos → forzamos no-store en cada petición.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(8000) }),
    },
  });
  return cached;
}
