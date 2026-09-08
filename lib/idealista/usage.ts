import "server-only";
import { IdealistaError } from "@/lib/errors";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Contador de peticiones REALES a la API de Idealista (100/mes por defecto).
 * Persiste en la tabla `events` (event_name = "idealista_request"), así sobrevive
 * a reinicios del servidor y refleja el consumo registrado del mes natural. Si
 * Supabase no está disponible, devuelve un estado desconocido sin romper la app.
 */

const EVENT = "idealista_request";

/** Tope mensual del plan (configurable con IDEALISTA_MONTHLY_LIMIT). */
export function monthlyLimit(): number {
  const n = Number(process.env.IDEALISTA_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.min(100, Math.floor(n)) : 100;
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
  count: number | null;
  limit: number;
  remaining: number | null;
  available: boolean;
}

/** Cuántas peticiones reales se han hecho en el mes natural actual. */
export async function getIdealistaUsage(): Promise<IdealistaUsage> {
  const limit = monthlyLimit();
  const month = currentMonth();
  const supabase = getServerSupabase();
  if (!supabase) {
    return { month, count: null, limit, remaining: null, available: false };
  }
  try {
    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", EVENT)
      .gte("created_at", monthStartIso());
    if (error) throw error;
    const used = count ?? 0;
    return {
      month,
      count: used,
      limit,
      remaining: Math.max(0, limit - used),
      available: true,
    };
  } catch (err) {
    console.warn("[idealista-usage] no se pudo contar", err);
    return { month, count: null, limit, remaining: null, available: false };
  }
}

/** Reserva atómica en Supabase. Sin contador seguro no se llama al proveedor. */
export async function reserveIdealistaRequest(): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new IdealistaError("quota store unavailable", { status: 503, userMessage: "Las búsquedas nuevas están pausadas: no se puede verificar la cuota. Puedes consultar los resultados guardados." });
  const { data, error } = await supabase.rpc("reserve_idealista_request", { p_limit: monthlyLimit(), p_kind: "search" });
  if (error || !Array.isArray(data) || typeof data[0]?.allowed !== "boolean") {
    throw new IdealistaError("quota reservation unavailable", { status: 503, userMessage: "Las búsquedas nuevas están pausadas hasta activar el control de cuota de la demo." });
  }
  if (!data[0].allowed) throw new IdealistaError("monthly quota exhausted", { status: 429, userMessage: "Se alcanzó el cupo mensual de búsquedas. Puedes seguir usando los anuncios guardados o la demo con datos ficticios." });
}
