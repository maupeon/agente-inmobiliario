import "server-only";
import { getServerSupabase } from "./supabase/server";

export type AnalyticsEvent =
  | { name: "search_performed"; data: { zona: string; operacion: string; resultCount: number } }
  | { name: "property_favorited"; data: { propertyId: string; price: number; district?: string } }
  | { name: "mortgage_calculated"; data: { price: number; monthlyPayment: number } }
  | { name: "conversation_started"; data: Record<string, never> }
  | { name: "tool_error"; data: { tool: string; reason: string } };

/**
 * Inserta un evento en la tabla `events` (sin PII). Nunca lanza:
 * si Supabase falla, lo ignora silenciosamente.
 */
export async function trackEvent(
  evt: AnalyticsEvent,
  userId?: string | null
): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  try {
    await supabase.from("events").insert({
      user_id: userId ?? null,
      event_name: evt.name,
      event_data: evt.data ?? {},
    });
  } catch (err) {
    console.warn("[analytics] failed to track", evt.name, err);
  }
}
