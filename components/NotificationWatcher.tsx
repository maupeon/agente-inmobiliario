"use client";
import { useEffect } from "react";
import type { NotificationState } from "@/lib/notifications/types";
const BROWSER_KEY = "habitia:browser-notifications";
const SEEN_KEY = "habitia:last-notified-digest";

/** Mounted with the global navigation; no notification permission prompt on load. */
export function NotificationWatcher() {
  useEffect(() => {
    let disposed = false;
    async function check() {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted" || localStorage.getItem(BROWSER_KEY) !== "true") return;
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok || disposed) return;
        const state = await response.json() as NotificationState;
        if (disposed) return;
        const digest = state.digests[0];
        if (!state.settings.enabled || !digest || digest.read_at || localStorage.getItem(SEEN_KEY) === digest.id) return;
        localStorage.setItem(SEEN_KEY, digest.id);
        const notification = new Notification("Tu selección de HabitIA está lista", { body: digest.items.length ? `${digest.items.length} viviendas afines a tu perfil te esperan en Notificaciones.` : "Consulta el resultado de tu búsqueda diaria.", tag: `habitia-${digest.id}`, icon: "/icon.svg" });
        notification.onclick = () => { window.focus(); window.location.assign("/notificaciones"); notification.close(); };
      } catch { /* Optional OS notification: the durable inbox remains available. */ }
    }
    check();
    const interval = setInterval(check, 60_000);
    window.addEventListener("habitia:notifications-changed", check);
    return () => { disposed = true; clearInterval(interval); window.removeEventListener("habitia:notifications-changed", check); };
  }, []);
  return null;
}
