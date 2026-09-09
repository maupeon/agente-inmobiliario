import { randomUUID } from "node:crypto";
import { validatedProfile } from "@/lib/api-validation";
import { recommend } from "@/lib/recommend";
import { notificationDb, PRIVATE_HEADERS, validCronAuthorization } from "@/lib/notifications/server";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One leased subscription per invocation bounds cost and duration. SQL schedules
 * only while work is due; concurrent invocations cannot claim the same profile. */
export async function GET(request: Request) {
  if (!validCronAuthorization(request)) return Response.json({ error: "unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    const db = notificationDb();
    if (new URL(request.url).searchParams.get("check") === "1") {
      const health = await db.from("notification_subscriptions").select("owner_hash", { head: true }).limit(0);
      if (health.error) throw new Error("notification schema unavailable");
      const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
      return Response.json({ ok: true, mode: "check", projectRef, workerVersion: "2026-09-09-v1" }, { headers: PRIVATE_HEADERS });
    }
    const lease = randomUUID();
    const claim = await db.rpc("claim_notification_subscription", { p_lease: lease });
    if (claim.error) throw new Error("claim unavailable");
    const row = claim.data?.[0];
    if (!row) return Response.json({ ok: true, processed: 0 }, { headers: PRIVATE_HEADERS });
    let items: Awaited<ReturnType<typeof recommend>>["items"] = [];
    let message: string | null = null;
    try {
      const profile = validatedProfile(row.profile);
      if (!profile?.zona) throw new Error("profile missing");
      const result = await recommend({ profile, narrate: false });
      items = result.items.filter((item, index, all) => all.findIndex((x) => x.property.propertyCode === item.property.propertyCode) === index).sort((a, b) => b.score - a.score).slice(0, 3);
    } catch (error) {
      // Keep private profile, provider payloads and credentials out of cron logs.
      console.error("[notifications] recommendation failed", error instanceof AppError ? error.code : "provider_error");
      message = error instanceof AppError ? error.userMessage : "No se ha podido preparar tu selección. Volveremos a intentarlo.";
    }
    const completed = await db.rpc("finish_notification_subscription", { p_owner: row.owner_hash, p_lease: lease, p_items: items, p_error: message });
    if (completed.error) throw new Error("completion unavailable");
    return Response.json({ ok: message === null, processed: 1, delivered: completed.data === true, count: message ? 0 : items.length }, { status: message ? 503 : 200, headers: PRIVATE_HEADERS });
  } catch {
    console.error("[notifications] persistence unavailable");
    return Response.json({ ok: false, error: "Notification worker unavailable" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
