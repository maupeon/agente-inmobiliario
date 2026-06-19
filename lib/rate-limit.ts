/**
 * Rate limiter en memoria del worker. Suficiente para una instancia única
 * en Vercel. Para multi-region o autoscale real usar Upstash Redis.
 *
 * Reglas:
 *   - máx 10 requests / minuto por IP
 *   - máx 50 requests / hora  por IP
 */

interface Bucket {
  windowStartMs: number;
  count: number;
}

const minuteBuckets = new Map<string, Bucket>();
const hourBuckets = new Map<string, Bucket>();

const MIN_LIMIT = 10;
const HOUR_LIMIT = 50;
const MIN_MS = 60_000;
const HOUR_MS = 60 * 60_000;

function check(map: Map<string, Bucket>, ip: string, windowMs: number, limit: number) {
  const now = Date.now();
  const b = map.get(ip);
  if (!b || now - b.windowStartMs >= windowMs) {
    map.set(ip, { windowStartMs: now, count: 1 });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    const retryAfter = Math.ceil((b.windowStartMs + windowMs - now) / 1000);
    return { ok: false, retryAfter };
  }
  return { ok: true, retryAfter: 0 };
}

export function rateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const m = check(minuteBuckets, ip, MIN_MS, MIN_LIMIT);
  if (!m.ok) return { ok: false, retryAfter: m.retryAfter };
  const h = check(hourBuckets, ip, HOUR_MS, HOUR_LIMIT);
  if (!h.ok) return { ok: false, retryAfter: h.retryAfter };
  return { ok: true };
}
