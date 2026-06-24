import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Contador de peticiones REALES a la API de Idealista (plan gratuito: 100/mes).
 * Persiste en la tabla `events` (event_name = "idealista_request"), así sobrevive
 * a reinicios del servidor y refleja el consumo real del mes natural. Si no hay
 * Supabase configurado, degrada a 0 sin romper nada.
 */

const EVENT = "idealista_request";

/** Tope mensual del plan (configurable con IDEALISTA_MONTHLY_LIMIT). */
export function monthlyLimit(): number {
  const n = Number(process.env.IDEALISTA_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

/** Etiqueta del mes natural actual en UTC, p. ej. "2026-06". */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Inicio del mes natural actual (UTC) en ISO, para filtrar los eventos. */
function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export interface IdealistaUsage {
  month: string;
  count: number;
  limit: number;
  remaining: number;
}

/** Cuántas peticiones reales se han hecho en el mes natural actual. */
export async function getIdealistaUsage(): Promise<IdealistaUsage> {
  const limit = monthlyLimit();
  const month = currentMonth();
  const supabase = getServerSupabase();
  if (!supabase) return { month, count: 0, limit, remaining: limit };
  try {
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", EVENT)
      .gte("created_at", monthStartIso());
    const used = count ?? 0;
    return { month, count: used, limit, remaining: Math.max(0, limit - used) };
  } catch (err) {
    console.warn("[idealista-usage] no se pudo contar", err);
    return { month, count: 0, limit, remaining: limit };
  }
}

/**
 * Registra una petición real a Idealista y deja traza en el log del servidor
 * con el acumulado del mes. Nunca lanza: si Supabase falla, solo avisa.
 * El insert se espera (persistencia); el recuento para el log no bloquea.
 */
export async function recordIdealistaRequest(kind: string): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) {
    console.warn(`[idealista] petición (${kind}) — sin Supabase, no se contabiliza`);
    return;
  }
  try {
    await supabase.from("events").insert({ event_name: EVENT, event_data: { kind } });
  } catch (err) {
    console.warn("[idealista] no se pudo registrar la petición", err);
    return;
  }
  getIdealistaUsage()
    .then(({ count, limit }) => {
      const warn =
        count >= limit ? " ⛔ TOPE MENSUAL ALCANZADO" : count >= limit * 0.9 ? " ⚠️ casi en el tope" : "";
      console.log(`[idealista] ${kind} → ${count}/${limit} peticiones este mes${warn}`);
    })
    .catch(() => {});
}
