import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente público (anon key). Se usa desde el cliente y desde las API
 * routes para lecturas que no necesitan saltarse RLS.
 *
 * Devuelve `null` si las variables no están definidas — así la app
 * arranca sin Supabase configurado y simplemente no persiste nada.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
