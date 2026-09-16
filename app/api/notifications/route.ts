import { isRecord, validatedProfile } from "@/lib/api-validation";
import { readDemoWrite } from "@/lib/demo-api";
import { handleError, ValidationError } from "@/lib/errors";
import { notificationDb, notificationIdentity, notificationResponse, PRIVATE_HEADERS, readNotificationState, unavailable } from "@/lib/notifications/server";
import { validNotificationTime, validTimeZone } from "@/lib/notifications/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function failure(error: unknown) {
  const e = handleError(error, { route: "/api/notifications" });
  return Response.json({ error: e.userMessage, code: e.code }, { status: e.status, headers: PRIVATE_HEADERS });
}
export async function GET() {
  try {
    const identity = (await notificationIdentity(true))!;
    return notificationResponse(await readNotificationState(identity.hash), identity);
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    const raw = await readDemoWrite(request, 14_000);
    if (!isRecord(raw) || typeof raw.enabled !== "boolean" || !validNotificationTime(raw.time) || !validTimeZone(raw.timeZone)) {
      throw new ValidationError("Invalid notification schedule", "Elige una hora válida y una zona horaria.");
    }
    const identity = await notificationIdentity();
    if (!identity) return Response.json({ error: "Recarga la página para guardar tu horario." }, { status: 401, headers: PRIVATE_HEADERS });
    const profile = validatedProfile(raw.profile);
    if (raw.enabled && !profile?.zona?.trim()) throw new ValidationError("Profile missing zone", "Completa tu perfil y elige una zona antes de activar las notificaciones.");
    const { error } = await notificationDb().rpc("save_notification_subscription", {
      p_owner: identity.hash, p_enabled: raw.enabled, p_time: raw.time, p_zone: raw.timeZone,
      p_profile: profile,
    });
    if (error) throw unavailable();
    return notificationResponse(await readNotificationState(identity.hash));
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    const raw = await readDemoWrite(request, 200);
    if (!isRecord(raw) || typeof raw.id !== "string" || !/^[a-f0-9-]{36}$/i.test(raw.id)) throw new ValidationError("Invalid digest");
    const identity = await notificationIdentity();
    if (!identity) return Response.json({ error: "Recarga la página." }, { status: 401, headers: PRIVATE_HEADERS });
    const { error } = await notificationDb().from("recommendation_digests").update({ read_at: new Date().toISOString() }).eq("owner_hash", identity.hash).eq("id", raw.id);
    if (error) throw unavailable();
    return notificationResponse({ ok: true });
  } catch (error) { return failure(error); }
}
