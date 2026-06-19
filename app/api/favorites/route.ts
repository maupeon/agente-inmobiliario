import { NextRequest } from "next/server";
import {
  listFavorites,
  removeFavorite,
  saveFavorite,
} from "@/lib/supabase/favorites";
import { handleError, ValidationError } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";
import type { Property } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  try {
    const favorites = await listFavorites(userId);
    return Response.json({ favorites });
  } catch (err) {
    const h = handleError(err, { route: "GET /api/favorites" });
    return Response.json({ error: h.userMessage }, { status: h.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId?: string; property?: Property };
    if (!body.property?.propertyCode) {
      throw new ValidationError("falta property", "Falta la propiedad a guardar.");
    }
    await saveFavorite(body.userId ?? null, body.property);
    void trackEvent(
      {
        name: "property_favorited",
        data: {
          propertyId: body.property.propertyCode,
          price: body.property.price,
          district: body.property.district,
        },
      },
      body.userId ?? null
    );
    return Response.json({ ok: true });
  } catch (err) {
    const h = handleError(err, { route: "POST /api/favorites" });
    return Response.json({ error: h.userMessage }, { status: h.status });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const propertyCode = req.nextUrl.searchParams.get("propertyCode");
  if (!propertyCode) {
    return Response.json(
      { error: "Falta propertyCode." },
      { status: 400 }
    );
  }
  try {
    await removeFavorite(userId, propertyCode);
    return Response.json({ ok: true });
  } catch (err) {
    const h = handleError(err, { route: "DELETE /api/favorites" });
    return Response.json({ error: h.userMessage }, { status: h.status });
  }
}
