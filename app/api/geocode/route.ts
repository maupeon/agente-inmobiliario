import { NextRequest } from "next/server";
import { geocodeAddress, reverseGeocode } from "@/lib/commute";
import { resolveMadridLocation } from "@/lib/search-location";
import { isMadridPoint, MADRID_SCOPE_MESSAGE } from "@/lib/search-scope";
import { handleError, ValidationError } from "@/lib/errors";
import { requestIp } from "@/lib/api-validation";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Geocodificación (server-side, para respetar la política de User-Agent de
 * Nominatim). Dos modos:
 *  - directo:  `?q=Gran Vía 28, Madrid`      → { result: { lat, lon, label } }
 *  - inverso:  `?lat=40.41&lon=-3.70`        → { result: { lat, lon, label } }
 * El selector de mapa del onboarding usa ambos (buscar y soltar pin).
 */
export async function GET(req: NextRequest) {
  const limit = rateLimit(`geocode:${requestIp(req)}`);
  if (!limit.ok) return Response.json({ result: null, error: "Espera un momento antes de buscar otra dirección." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const { searchParams } = req.nextUrl;
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  const madridOnly = searchParams.get("scope") === "madrid";

  try {
    if (latRaw != null || lonRaw != null) {
      const lat = latRaw?.trim() ? Number(latRaw) : NaN;
      const lon = lonRaw?.trim() ? Number(lonRaw) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new ValidationError("invalid geocode coordinates", "Selecciona un punto válido en el mapa.");
      if (madridOnly && !isMadridPoint(lat, lon)) return Response.json({ result: null, error: MADRID_SCOPE_MESSAGE }, { status: 400 });
      const rev = await reverseGeocode(lat, lon);
      return Response.json({ result: rev ? { lat, lon, label: rev.label } : { lat, lon, label: null } });
    }

    const q = searchParams.get("q")?.trim();
    if (!q) return Response.json({ result: null });
    if (q.length > 300) throw new ValidationError("geocode query too long", "Escribe una dirección de hasta 300 caracteres.");
    const result = madridOnly ? await resolveMadridLocation(q) : await geocodeAddress(q);
    return Response.json({ result });
  } catch (error) {
    const friendly = handleError(error);
    return Response.json({ result: null, error: friendly.userMessage }, { status: friendly.status });
  }
}
