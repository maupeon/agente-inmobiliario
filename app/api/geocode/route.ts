import { NextRequest } from "next/server";
import { geocodeAddress } from "@/lib/commute";

export const runtime = "nodejs";

/**
 * Geocodifica una dirección (server-side, para respetar la política de
 * User-Agent de Nominatim). Lo usa el onboarding para guardar las coordenadas
 * del lugar de trabajo y no tener que volver a geocodificar en cada trayecto.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return Response.json({ result: null });
  const result = await geocodeAddress(q);
  return Response.json({ result });
}
