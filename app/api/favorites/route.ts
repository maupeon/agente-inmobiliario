import { isRecord, validProperty } from "@/lib/api-validation";
import { DEMO_HEADERS, readDemoWrite } from "@/lib/demo-api";
import { handleError, ValidationError } from "@/lib/errors";
import { listDemoFavorites, saveDemoFavorite, removeDemoFavorite } from "@/lib/supabase/demo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ favorites: await listDemoFavorites() }, { headers: DEMO_HEADERS }); }
  catch (error) {
    const e = handleError(error, { route: "demo favorites" });
    return Response.json({ error: e.userMessage }, { status: e.status, headers: DEMO_HEADERS });
  }
}
export async function POST(req: Request) {
  try {
    const body = await readDemoWrite(req, 100_000);
    if (!isRecord(body) || !validProperty(body.property) || !body.property.propertyCode.trim()) throw new ValidationError("invalid favorite", "El inmueble no tiene un formato válido.");
    await saveDemoFavorite(body.property);
    return Response.json({ saved: true }, { headers: DEMO_HEADERS });
  } catch (error) {
    const e = handleError(error, { route: "save demo favorite" });
    return Response.json({ error: e.userMessage }, { status: e.status, headers: DEMO_HEADERS });
  }
}
export async function DELETE(req: Request) {
  try {
    const body = await readDemoWrite(req, 1_000);
    if (!isRecord(body) || typeof body.propertyCode !== "string" || !body.propertyCode.trim() || body.propertyCode.length > 80) throw new ValidationError("invalid property code");
    await removeDemoFavorite(body.propertyCode);
    return Response.json({ removed: true }, { headers: DEMO_HEADERS });
  } catch (error) {
    const e = handleError(error, { route: "remove demo favorite" });
    return Response.json({ error: e.userMessage }, { status: e.status, headers: DEMO_HEADERS });
  }
}
