import "server-only";
import { readJson, requestIp } from "@/lib/api-validation";
import { AppError, RateLimitError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
export const DEMO_HEADERS = { "Cache-Control": "no-store, max-age=0" };
export async function readDemoWrite(req: Request, maxBytes: number): Promise<unknown> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) throw new AppError({ code: "invalid_origin", message: "Cross-origin demo write", status: 403, userMessage: "Guarda los datos desde la aplicación." });
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AppError({ code: "invalid_content_type", message: "JSON required", status: 415, userMessage: "La petición debe usar JSON." });
  const limit = rateLimit(`demo-write:${requestIp(req)}`);
  if (!limit.ok) throw new RateLimitError(limit.retryAfter);
  return readJson(req, maxBytes);
}
