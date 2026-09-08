import "server-only";
import { createHash } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Property } from "@/types";
const TTL = 24 * 60 * 60_000;
const memory = new Map<string, { until: number; properties: Property[] }>();
const pending = new Map<string, Promise<Property[]>>();
export async function cachedSearch(params: string, load: () => Promise<Property[]>): Promise<Property[]> {
  const key = createHash("sha256").update(params).digest("hex");
  const cached = memory.get(key);
  if (cached && cached.until > Date.now()) return cached.properties;
  if (pending.has(key)) return pending.get(key)!;
  const promise = (async () => {
    const db = getServerSupabase();
    if (db) {
      const { data } = await db.from("idealista_search_cache").select("properties, expires_at").eq("key", key).maybeSingle();
      if (data && Date.parse(data.expires_at) > Date.now() && Array.isArray(data.properties)) {
        memory.set(key, { until: Date.parse(data.expires_at), properties: data.properties });
        return data.properties as Property[];
      }
    }
    const properties = await load();
    const until = Date.now() + TTL;
    if (memory.size >= 100) memory.delete(memory.keys().next().value!);
    memory.set(key, { until, properties });
    if (db) await db.from("idealista_search_cache").upsert({ key, properties, expires_at: new Date(until).toISOString() });
    return properties;
  })();
  pending.set(key, promise);
  try { return await promise; } finally { pending.delete(key); }
}
