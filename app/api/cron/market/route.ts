import { NextResponse } from "next/server";
import { refreshMarketData } from "@/lib/market/cache";

/**
 * Cron diario que refresca los datos de mercado en la tabla `market_data`.
 *
 * Vercel Cron invoca esta ruta con la cabecera estándar
 *   `Authorization: Bearer <CRON_SECRET>`
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * Si no hay secreto configurado en producción, devolvemos 401 antes de tocar
 * Supabase para evitar disparos anónimos.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET no configurado" },
        { status: 500 }
      );
    }
    // En desarrollo permitimos disparar sin auth para iterar.
  } else {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  const summary = await refreshMarketData();
  const durationMs = Date.now() - startedAt;

  console.log("[cron/market]", {
    refreshed: summary.refreshed,
    failed: summary.failed,
    durationMs,
  });

  const status = summary.failed.length === 0 ? 200 : 207;
  return NextResponse.json({ ok: true, ...summary, durationMs }, { status });
}
