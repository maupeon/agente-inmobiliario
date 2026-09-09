import type { PropertyRecommendation, UserProfile } from "@/types";

export interface NotificationSettings {
  enabled: boolean;
  time: string;
  timeZone: string;
  nextRunAt: string | null;
  profile: UserProfile | null;
  lastError: string | null;
}
export interface RecommendationDigest {
  id: string;
  local_date: string;
  created_at: string;
  items: PropertyRecommendation[];
  read_at: string | null;
}
export interface NotificationState {
  settings: NotificationSettings;
  digests: RecommendationDigest[];
}
export const DEFAULT_NOTIFICATION_TIME = "07:00";
export const DEFAULT_NOTIFICATION_ZONE = "Europe/Madrid";

export function validNotificationTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 80) return false;
  try { new Intl.DateTimeFormat("es-ES", { timeZone: value }).format(); return true; }
  catch { return false; }
}
