import { isRecord, readJson, validProperty, validatedProfile } from "@/lib/api-validation";
import { NextRequest } from "next/server";
import { enrichProperties } from "@/lib/enrich";
import { handleError, RateLimitError, ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import type { Property, PropertyEnrichment, UserProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Tope de propiedades por petición, para acotar el coste del lote. */
const MAX_PROPERTIES = 24;

interface EnrichRequestBody {
  properties?: Property[];
  profile?: UserProfile | null;
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    const err = new RateLimitError(limit.retryAfter);
    return Response.json(
      { code: err.code, error: err.userMessage },
      { status: err.status, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: EnrichRequestBody;
  try {
    const raw = await readJson(req, 400_000);
    if (!isRecord(raw) || !Array.isArray(raw.properties) || raw.properties.length > MAX_PROPERTIES || !raw.properties.every(validProperty)) throw new ValidationError("invalid properties");
    body = { properties: raw.properties, profile: validatedProfile(raw.profile) };
  } catch {
    const err = new ValidationError("body inválido", "No he entendido la petición.");
    return Response.json({ code: err.code, error: err.userMessage }, { status: 400 });
  }

  if (!Array.isArray(body.properties)) {
    const err = new ValidationError("properties debe ser un array");
    return Response.json({ code: err.code, error: err.userMessage }, { status: 400 });
  }

  const properties = body.properties.slice(0, MAX_PROPERTIES);

  try {
    const enrichments: PropertyEnrichment[] = await enrichProperties(
      properties,
      body.profile ?? null
    );
    return Response.json({ enrichments });
  } catch (err) {
    const friendly = handleError(err, { route: "/api/enrich" });
    return Response.json(
      { code: friendly.code, error: friendly.userMessage },
      { status: friendly.status }
    );
  }
}
