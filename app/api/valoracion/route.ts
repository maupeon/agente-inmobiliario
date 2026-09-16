import { saludValoracion, valoracionDisponible, valorarLoteConEstado, MAX_VALORACION_BATCH } from "@/lib/valoracion/client";
import { isRecord, readJson, requestIp, validProperty } from "@/lib/api-validation";
import { rateLimit } from "@/lib/rate-limit";
import type { Property } from "@/types";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const limit = rateLimit(`valoracion:${requestIp(req)}`);
  if (!limit.ok) return Response.json({ error: "Demasiadas consultas." }, { status: 429 });
  if (!valoracionDisponible()) return Response.json({ configurado: false, motivo: "Servicio no configurado" });
  const salud = await saludValoracion();
  return Response.json({ configurado: true, servicio: salud ?? "sin respuesta" });
}
export async function POST(req: Request) {
  const limit = rateLimit(`valoracion:${requestIp(req)}`);
  if (!limit.ok) return Response.json({ error: "Demasiadas consultas." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    const body = await readJson(req, 400_000);
    if (!isRecord(body) || !Array.isArray(body.properties) || !body.properties.length || body.properties.length > MAX_VALORACION_BATCH) return Response.json({ error: "Envía entre 1 y 24 anuncios." }, { status: 400 });
    if (!body.properties.every(validProperty) || new Set(body.properties.map((p) => p.propertyCode)).size !== body.properties.length) return Response.json({ error: "Hay anuncios con datos inválidos o identificadores duplicados." }, { status: 400 });
    const batch = await valorarLoteConEstado(body.properties as Property[]);
    return Response.json({ valoradas: batch.resultados.size, total: body.properties.length, resultados: Object.fromEntries(batch.resultados), estados: Object.fromEntries(batch.estados) });
  } catch { return Response.json({ error: "Petición inválida o demasiado grande." }, { status: 400 }); }
}
