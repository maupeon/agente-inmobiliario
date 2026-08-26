import { NextResponse } from "next/server";
import { saludValoracion, valoracionDisponible, valorarLote } from "@/lib/valoracion/client";
import type { Property } from "@/types";

export const runtime = "nodejs";

/** Estado del servicio de valoración, para diagnóstico. */
export async function GET() {
  if (!valoracionDisponible()) {
    return NextResponse.json(
      { configurado: false, motivo: "falta VALORACION_URL" },
      { status: 200 }
    );
  }
  const salud = await saludValoracion();
  return NextResponse.json({ configurado: true, servicio: salud ?? "sin respuesta" });
}

/** Valora un lote de propiedades ya normalizadas. */
export async function POST(req: Request) {
  const { properties } = (await req.json()) as { properties?: Property[] };
  if (!Array.isArray(properties) || properties.length === 0) {
    return NextResponse.json({ error: "envía { properties: Property[] }" }, { status: 400 });
  }
  const mapa = await valorarLote(properties);
  return NextResponse.json({
    valoradas: mapa.size,
    total: properties.length,
    resultados: Object.fromEntries(mapa),
  });
}
