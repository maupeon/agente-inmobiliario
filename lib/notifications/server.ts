import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { DEFAULT_NOTIFICATION_TIME, DEFAULT_NOTIFICATION_ZONE } from "./types";
import type { NotificationState } from "./types";

const COOKIE = "habitia_notifications";
const TOKEN = /^[a-f0-9]{64}$/;
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
export function notificationIdentity(create = false): { hash: string; token: string; fresh: boolean } | null {
  const existing = cookies().get(COOKIE)?.value;
  const token = existing && TOKEN.test(existing) ? existing : create ? randomBytes(32).toString("hex") : null;
  return token ? { token, hash: createHash("sha256").update(token).digest("hex"), fresh: token !== existing } : null;
}
export function notificationResponse(value: unknown, identity?: ReturnType<typeof notificationIdentity>) {
  const response = NextResponse.json(value, { headers: PRIVATE_HEADERS });
  if (identity?.fresh) response.cookies.set(COOKIE, identity.token, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
export function notificationDb() {
  const db = getServerSupabase();
  if (!db) throw unavailable();
  return db;
}
export function unavailable() {
  return new AppError({ code: "notifications_unavailable", status: 503,
    message: "Notification storage not available", userMessage: "Las notificaciones todavía no están disponibles. No se ha activado ni cambiado tu horario. Inténtalo más tarde." });
}
export async function readNotificationState(hash: string): Promise<NotificationState> {
  const db = notificationDb();
  const [settings, digests] = await Promise.all([
    db.from("notification_subscriptions").select("enabled,local_time,time_zone,next_run_at,expires_at,profile,last_error").eq("owner_hash", hash).maybeSingle(),
    db.from("recommendation_digests").select("id,local_date,created_at,items,read_at").eq("owner_hash", hash).order("created_at", { ascending: false }).limit(30),
  ]);
  if (settings.error || digests.error) throw unavailable();
  const s = settings.data;
  const expired = Boolean(s?.expires_at && Date.parse(s.expires_at) <= Date.now());
  return { settings: {
    enabled: !expired && (s?.enabled ?? false), time: s?.local_time?.slice(0, 5) ?? DEFAULT_NOTIFICATION_TIME,
    timeZone: s?.time_zone ?? DEFAULT_NOTIFICATION_ZONE, nextRunAt: expired ? null : s?.next_run_at ?? null,
    profile: s?.profile ?? null, lastError: expired ? "La selección se ha pausado tras 90 días sin guardar. Puedes volver a activarla." : s?.last_error ?? null,
  }, digests: digests.data ?? [] };
}
export function validCronAuthorization(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
