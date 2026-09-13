import { NextRequest } from "next/server";
import { geocodeAddress, reverseGeocode } from "@/lib/commute";
import { resolveMadridLocation } from "@/lib/search-location";
import { isMadridPoint, MADRID_SCOPE_MESSAGE } from "@/lib/search-scope";
import { handleError } from "@/lib/errors";

export const runtime = "nodejs";

/**
 * Geocodificación (server-side, para respetar la política de User-Agent de
 * Nominatim). Dos modos:
 *  - directo:  `?q=Gran Vía 28, Madrid`      → { result: { lat, lon, label } }
 *  - inverso:  `?lat=40.41&lon=-3.70`        → { result: { lat, lon, label } }
 * El selector de mapa del onboarding usa ambos (buscar y soltar pin).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  const madridOnly = searchParams.get("scope") === "madrid";

  if (latRaw != null && lonRaw != null) {
    const lat = Number.parseFloat(latRaw);
    const lon = Number.parseFloat(lonRaw);
    if (madridOnly && !isMadridPoint(lat, lon)) return Response.json({ result: null, error: MADRID_SCOPE_MESSAGE }, { status: 400 });
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return Response.json({ result: null });
    }
    const rev = await reverseGeocode(lat, lon);
    return Response.json({ result: rev ? { lat, lon, label: rev.label } : { lat, lon, label: null } });
  }

  const q = searchParams.get("q")?.trim();
  if (!q) return Response.json({ result: null });
  try {
    const result = madridOnly ? await resolveMadridLocation(q) : await geocodeAddress(q);
    return Response.json({ result });
  } catch (error) {
    const friendly = handleError(error);
    return Response.json({ result: null, error: friendly.userMessage }, { status: friendly.status });
  }
}
