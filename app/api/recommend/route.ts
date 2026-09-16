import { isRecord, readJson, validatedProfile } from "@/lib/api-validation";
import { NextRequest } from "next/server";
import { recommend } from "@/lib/recommend";
import { handleError, RateLimitError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import type { UserProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RecommendRequestBody {
  confirmSearch?: boolean;
  profile?: UserProfile | null;
  zona?: string;
  operacion?: "venta" | "alquiler";
  precioMax?: number | null;
  habitaciones?: number | null;
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

  let body: RecommendRequestBody;
  try {
    const raw = await readJson(req, 12_000);
    if (!isRecord(raw) || (raw.zona !== undefined && (typeof raw.zona !== "string" || raw.zona.length > 200)) || (raw.operacion !== undefined && !["venta", "alquiler"].includes(String(raw.operacion)))
      || (raw.precioMax != null && (!Number.isFinite(raw.precioMax) || Number(raw.precioMax) <= 0))
      || (raw.habitaciones != null && (!Number.isInteger(raw.habitaciones) || Number(raw.habitaciones) < 0 || Number(raw.habitaciones) > 100))) return Response.json({ error: "Filtros inválidos." }, { status: 400 });
    body = { ...raw, profile: validatedProfile(raw.profile) } as RecommendRequestBody;
  } catch {
    return Response.json({ error: "Petición inválida." }, { status: 400 });
  }

  // Protección adicional frente a clientes que todavía busquen al montar.
  if (body.confirmSearch !== true) {
    return Response.json(
      { code: "SEARCH_CONFIRMATION_REQUIRED", error: "Confirma la búsqueda antes de consultar Idealista." },
      { status: 428 }
    );
  }

  try {
    const { filters, items, intro } = await recommend({
      profile: body.profile ?? null,
      zona: body.zona,
      operacion: body.operacion,
      precioMax: body.precioMax,
      habitaciones: body.habitaciones,
    });
    return Response.json({ filters, items, intro });
  } catch (err) {
    const friendly = handleError(err, { route: "/api/recommend" });
    return Response.json(
      { code: friendly.code, error: friendly.userMessage },
      { status: friendly.status }
    );
  }
}
