import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  FALLBACK_IPV,
  FALLBACK_MORTGAGE_RATES,
  FALLBACK_PRICE_BY_PROVINCE,
  FALLBACK_RENT_REFERENCE,
} from "./fixtures";
import { fetchBdeMortgageRates } from "./bde";
import { fetchIneIpvQuarterly, fetchInePriceByProvince } from "./ine";
import { fetchRentReference } from "./rent";
import type { MarketDataKey, MarketDataPayload } from "./types";

/**
 * Cache de datos de mercado en Supabase.
 *
 * Los datos se refrescan en un cron diario (Vercel Cron → /api/cron/market).
 * `getMarketData()` devuelve la última versión cacheada o, como respaldo,
 * los fixtures locales para que el agente nunca se quede sin datos que citar.
 *
 * No reintentamos refresh desde el read path: si Supabase devuelve algo
 * caducado, igual lo servimos — el cron lo arreglará en su próxima pasada.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

const FALLBACKS: { [K in MarketDataKey]: MarketDataPayload[K] } = {
  ine_price_by_province: FALLBACK_PRICE_BY_PROVINCE,
  bde_mortgage_rates: FALLBACK_MORTGAGE_RATES,
  ine_ipv_quarterly: FALLBACK_IPV,
  rent_reference: FALLBACK_RENT_REFERENCE,
};

export interface CachedMarketData<K extends MarketDataKey> {
  key: K;
  data: MarketDataPayload[K];
  /** ISO timestamp de la última escritura, o `null` si solo tenemos fallback. */
  updatedAt: string | null;
  /** `true` si el dato proviene de los fixtures (no hay fila en Supabase). */
  fromFallback: boolean;
}

export async function getMarketData<K extends MarketDataKey>(
  key: K
): Promise<CachedMarketData<K>> {
  const supabase = getServerSupabase();
  if (!supabase) return wrapFallback(key);

  const { data, error } = await supabase
    .from("market_data")
    .select("data, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.warn(`[market/cache] read error for ${key}`, error.message);
    return wrapFallback(key);
  }
  if (!data) return wrapFallback(key);

  return {
    key,
    data: data.data as MarketDataPayload[K],
    updatedAt: data.updated_at as string,
    fromFallback: false,
  };
}

export interface RefreshSummary {
  refreshed: MarketDataKey[];
  failed: Array<{ key: MarketDataKey; error: string }>;
}

/**
 * Refresco completo de los tres datasets. Cada fetch encapsula su propio
 * fallback, así que aquí solo nos preocupamos del upsert a Supabase.
 */
export async function refreshMarketData(): Promise<RefreshSummary> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      refreshed: [],
      failed: [
        { key: "ine_price_by_province", error: "supabase no configurado" },
        { key: "bde_mortgage_rates", error: "supabase no configurado" },
        { key: "ine_ipv_quarterly", error: "supabase no configurado" },
      ],
    };
  }

  const fetched = await Promise.all([
    safeFetch("ine_price_by_province", fetchInePriceByProvince),
    safeFetch("bde_mortgage_rates", fetchBdeMortgageRates),
    safeFetch("ine_ipv_quarterly", fetchIneIpvQuarterly),
    safeFetch("rent_reference", fetchRentReference),
  ]);

  const summary: RefreshSummary = { refreshed: [], failed: [] };

  for (const item of fetched) {
    if (!item.ok) {
      summary.failed.push({ key: item.key, error: item.error });
      continue;
    }
    const { error } = await supabase
      .from("market_data")
      .upsert(
        { key: item.key, data: item.data, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      summary.failed.push({ key: item.key, error: error.message });
    } else {
      summary.refreshed.push(item.key);
    }
  }

  return summary;
}

/** Útil para health checks: `true` si la fila existe y se actualizó hace < 24h. */
export function isFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() < TTL_MS;
}

function wrapFallback<K extends MarketDataKey>(key: K): CachedMarketData<K> {
  return {
    key,
    data: FALLBACKS[key],
    updatedAt: null,
    fromFallback: true,
  };
}

type SafeFetched<K extends MarketDataKey> =
  | { ok: true; key: K; data: MarketDataPayload[K] }
  | { ok: false; key: K; error: string };

async function safeFetch<K extends MarketDataKey>(
  key: K,
  fn: () => Promise<MarketDataPayload[K]>
): Promise<SafeFetched<K>> {
  try {
    const data = await fn();
    return { ok: true, key, data };
  } catch (err) {
    return { ok: false, key, error: err instanceof Error ? err.message : String(err) };
  }
}
