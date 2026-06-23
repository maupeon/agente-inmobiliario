import { NextRequest } from "next/server";
import { recommend } from "@/lib/recommend";
import { handleError, RateLimitError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import type { UserProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RecommendRequestBody {
  profile?: UserProfile | null;
  zona?: string;
  operacion?: "venta" | "alquiler";
  precioMax?: number;
  habitaciones?: number;
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
    body = (await req.json()) as RecommendRequestBody;
  } catch {
    body = {};
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
