import { NextRequest } from "next/server";
import { runDetallePropiedad } from "@/lib/agent/tools/detalle-propiedad";
import { handleError } from "@/lib/errors";

export const runtime = "nodejs";

/** Ficha completa de una propiedad (fotos, descripción, características). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) return Response.json({ detail: null }, { status: 400 });
  try {
    const r = await runDetallePropiedad({ propertyCode: code });
    return Response.json({ detail: r.property });
  } catch (err) {
    const friendly = handleError(err, { route: "/api/property" });
    return Response.json({ detail: null, error: friendly.userMessage }, { status: friendly.status });
  }
}
