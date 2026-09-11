"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, BellSlash, Check, Clock, ArrowRight } from "@phosphor-icons/react";
import { SiteNav } from "./SiteNav";
import { useProfile } from "@/hooks/useProfile";
import { DEFAULT_NOTIFICATION_TIME, DEFAULT_NOTIFICATION_ZONE } from "@/lib/notifications/types";
import type { NotificationState } from "@/lib/notifications/types";
import { digestTitle } from "@/lib/notifications/presentation";
import { formatEUR } from "@/lib/utils";

const BROWSER_KEY = "habitia:browser-notifications";
const SEEN_KEY = "habitia:last-notified-digest";
const ZONES = ["Europe/Madrid", "Atlantic/Canary", "Europe/London", "Europe/Paris", "America/Mexico_City", "America/Bogota", "America/Argentina/Buenos_Aires", "America/New_York", "UTC"];

export function NotificationCenter() {
  const { profile, loaded } = useProfile();
  const [state, setState] = useState<NotificationState | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(DEFAULT_NOTIFICATION_TIME);
  const [zone, setZone] = useState(DEFAULT_NOTIFICATION_ZONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrySave, setRetrySave] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [pending, setPending] = useState(true);

  const refresh = useCallback(async (initialize = false) => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No hemos podido cargar tus notificaciones.");
      const result = data as NotificationState;
      setState(result);
      if (initialize) { setEnabled(result.settings.enabled); setTime(result.settings.time); setZone(result.settings.timeZone); }
      setLoadError(null);
    } catch (e) { setLoadError(e instanceof Error ? e.message : "No hay conexión. Inténtalo de nuevo."); }
    finally { setPending(false); }
  }, []);

  useEffect(() => {
    refresh(true);
    setBrowserSupported("Notification" in window);
    try { setBrowserEnabled(localStorage.getItem(BROWSER_KEY) === "true" && "Notification" in window && Notification.permission === "granted"); } catch { /* unavailable storage */ }
    const interval = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  async function save() {
    setSaving(true); setMessage(null); setError(null); setRetrySave(false);
    try {
      const response = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, time, timeZone: zone, profile: profile ?? state?.settings.profile }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No hemos podido guardar el horario.");
      setState(data); setLoadError(null); setMessage(enabled ? "Horario y perfil guardados. Tu selección diaria está activada." : "Selección diaria pausada.");
      window.dispatchEvent(new Event("habitia:notifications-changed"));
    } catch (e) { setRetrySave(true); setError(e instanceof Error ? e.message : "No hay conexión. Tu horario no se ha cambiado."); }
    finally { setSaving(false); }
  }

  async function toggleBrowser() {
    setRetrySave(false); setError(null);
    try {
      if (browserEnabled) { localStorage.removeItem(BROWSER_KEY); setBrowserEnabled(false); return; }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setMessage("Los avisos del navegador no están permitidos. La selección seguirá disponible en esta pestaña."); return; }
      localStorage.setItem(BROWSER_KEY, "true");
      // Do not pop an old digest as if it had just arrived.
      if (state?.digests[0]) localStorage.setItem(SEEN_KEY, state.digests[0].id);
      setBrowserEnabled(true); setMessage("Avisos activados mientras HabitIA esté abierta en este navegador.");
    } catch { setError("Este navegador no permite activar avisos. Puedes consultar la selección aquí."); }
  }

  async function markRead(id: string) {
    setRetrySave(false); setError(null);
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error();
      setState((s) => s ? { ...s, digests: s.digests.map((d) => d.id === id ? { ...d, read_at: new Date().toISOString() } : d) } : s);
    } catch { setError("No se ha podido marcar como leída. Vuelve a intentarlo."); }
  }

  const canonicalProfile = (value: unknown): string => JSON.stringify(value, function (key, item) {
    if (key === "createdAt") return undefined;
    return item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item;
  });
  const profileChanged = profile && state?.settings.profile && canonicalProfile(profile) !== canonicalProfile(state.settings.profile);
  const hasProfile = Boolean((profile ?? state?.settings.profile)?.zona);
  return <>
    <SiteNav />
    <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-forest-700">A tu ritmo</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Tus cinco viviendas del día</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">Una selección ordenada por tu HabitIA Score, con tus preferencias y tu presupuesto. Tú eliges a qué hora encontrarla aquí.</p>
      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section aria-labelledby="notification-settings" className="rounded-3xl border border-hairline bg-paper-50 p-6 shadow-nudge">
          <div className="flex items-center gap-3"><Bell aria-hidden size={24} className="text-forest-700" /><h2 id="notification-settings" className="text-xl font-semibold">Notificaciones</h2></div>
          {pending ? <p role="status" className="mt-6 text-stone-600">Cargando tu horario…</p> : <>
            <label className="mt-6 flex min-h-12 cursor-pointer items-center gap-3 font-medium">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!state || saving} className="h-5 w-5 accent-forest-700" /> Selección diaria
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="block text-sm font-medium">Hora local<input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!state || saving} className="mt-2 block min-h-12 w-full rounded-xl border border-hairline bg-white px-3 text-base" /></label>
              <label className="block text-sm font-medium">Zona horaria<select value={zone} onChange={(e) => setZone(e.target.value)} disabled={!state || saving} className="mt-2 block min-h-12 w-full rounded-xl border border-hairline bg-white px-3 text-base">
                {Array.from(new Set([...ZONES, zone])).map((z) => <option key={z} value={z}>{z === "Europe/Madrid" ? "España peninsular" : z === "Atlantic/Canary" ? "Canarias" : z.replaceAll("_", " ")}</option>)}
              </select></label>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">El horario se adapta al cambio de hora. La preparación puede tardar unos minutos.</p>
            {loaded && !hasProfile && <p className="mt-5 text-sm text-stone-600">Primero <Link className="font-semibold underline underline-offset-4" href="/dashboard">crea tu perfil y elige una zona</Link>.</p>}
            {hasProfile && <p className="mt-5 text-sm text-stone-600">Perfil para la próxima selección: <strong className="text-ink">{(profile ?? state?.settings.profile)?.zona}</strong>, {(profile ?? state?.settings.profile)?.operacion === "venta" ? "compra" : "alquiler"}.</p>}
            {profileChanged && <p className="mt-3 text-sm font-medium text-forest-700">Tu perfil ha cambiado. Guarda para usar las nuevas preferencias en la selección diaria.</p>}
            <p className="mt-5 text-sm leading-relaxed text-stone-600">Al activar y guardar, autorizas una búsqueda diaria automática. Conservamos una copia de tu perfil para prepararla aunque no tengas la app abierta. Las búsquedas respetan la caché de 24 horas y la cuota compartida de Idealista.</p>
            <button type="button" onClick={save} disabled={saving || !state || (enabled && !hasProfile) || !time} className="pressable mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 font-medium text-paper disabled:opacity-40">
              {saving ? "Guardando…" : <><Check aria-hidden size={18} />Guardar horario y perfil</>}
            </button>
            {state?.settings.enabled && state.settings.nextRunAt && <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-forest-700"><Clock aria-hidden size={18} className="mt-0.5 shrink-0" />Próxima selección: {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: state.settings.timeZone }).format(new Date(state.settings.nextRunAt))} ({state.settings.timeZone}).</p>}
            {state?.settings.lastError && <p className="mt-4 text-sm text-amber-800">Último intento: {state.settings.lastError}</p>}
          </>}
          <div className="mt-6 border-t border-hairline pt-5">
            <h3 className="font-medium">Aviso del navegador</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">Opcional, mientras HabitIA esté abierta. Con la app cerrada, tu selección queda guardada aquí; este aviso no funciona como una notificación push.</p>
            <button type="button" onClick={toggleBrowser} disabled={!browserSupported} className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-hairline px-4 text-sm font-medium disabled:opacity-40">{browserEnabled ? <BellSlash aria-hidden size={18} /> : <Bell aria-hidden size={18} />}{browserEnabled ? "Desactivar aviso" : "Permitir aviso"}</button>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-stone-500">Configuración propia de este navegador. No se comparte con el historial de la demo. Si borras sus cookies, perderás el acceso a esta selección. Se pausa tras 90 días sin guardar la configuración.</p>
        </section>
        <section aria-labelledby="notification-inbox" className="min-w-0">
          <h2 id="notification-inbox" className="text-xl font-semibold">Tu selección</h2>
          {(error || loadError) && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error || loadError}{(retrySave || !error) && <button type="button" className="ml-2 min-h-11 font-semibold underline" onClick={() => retrySave ? save() : refresh(!state)}>Reintentar</button>}</div>}
          {message && <p role="status" className="mt-4 rounded-xl bg-forest-50 p-4 text-sm text-forest-800">{message}</p>}
          {!pending && state && state.digests.length === 0 && <div className="mt-5 rounded-3xl border border-dashed border-stone-300 p-8"><Bell aria-hidden size={32} className="text-stone-400" /><h3 className="mt-4 text-lg font-semibold">La próxima puede estar aquí</h3><p className="mt-2 text-base leading-relaxed text-stone-600">{state.settings.enabled ? "Tu primera selección llegará en el horario guardado. Mientras tanto, puedes explorar viviendas en el buscador." : "Activa la selección diaria y guarda tu horario para recibir las viviendas que mejor encajan contigo."}</p><Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-forest-700">Explorar viviendas <ArrowRight aria-hidden size={17} /></Link></div>}
          <div className="mt-5 space-y-7">{state?.digests.map((digest) => <article key={digest.id} className="rounded-3xl border border-hairline bg-paper-50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{digestTitle(digest)}</h3>{!digest.read_at && <button type="button" onClick={() => markRead(digest.id)} className="min-h-11 text-sm font-medium text-forest-700">Marcar como leída</button>}</div>
            {digest.items.length === 0 ? <p className="mt-4 leading-relaxed text-stone-600">Hoy no encontramos viviendas que cumplan tus filtros. Puedes ampliar la zona o ajustar tu presupuesto y guardar de nuevo tu perfil.</p> : <>
              <p className="mt-1 text-sm text-stone-500">{digest.items.length === 5 ? "Las cinco con mayor encaje entre las candidatas encontradas." : `Encontramos ${digest.items.length} ${digest.items.length === 1 ? "vivienda compatible" : "viviendas compatibles"}. Mostramos solo las disponibles.`}</p>
              <ol className="mt-5 divide-y divide-hairline">{digest.items.map((item) => <li key={item.property.propertyCode} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h4 className="break-words font-semibold leading-snug">{item.property.title || item.property.address || "Vivienda"}</h4><p className="mt-1 text-sm text-stone-500">{[item.property.district, item.property.municipality, item.property.province].filter(Boolean).filter((s, i, a) => a.indexOf(s) === i).join(" · ") || "Ubicación no indicada"}</p></div><span className="shrink-0 rounded-lg bg-forest-50 px-2 py-1 text-sm font-semibold text-forest-800">{item.score}/100</span></div>
                <p className="mt-3 text-xl font-semibold tabular-nums">{formatEUR(item.property.price)}{item.property.operation === "rent" && <span className="text-sm font-normal text-stone-500"> / mes</span>}</p>
                <p className="mt-1 text-sm text-stone-500">{item.property.size} m²{item.property.rooms != null ? ` · ${item.property.rooms} hab.` : ""}{item.property.sourceKind === "demo" ? " · Ejemplo de demostración" : ""}</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.rationale}</p>
                {item.scoring && <p className="mt-2 text-xs leading-relaxed text-stone-500">Cobertura del score: {item.scoring.coveragePercent} %. Los criterios sin datos no reciben puntos.</p>}
                {item.property.sourceKind !== "demo" && /^https:\/\/(?:www\.)?idealista\.(?:com|pt|it)\//i.test(item.property.url) && <a href={item.property.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-forest-700">Ver anuncio <ArrowRight aria-hidden size={16} /></a>}
              </li>)}</ol>
              <p className="mt-5 border-t border-hairline pt-4 text-xs leading-relaxed text-stone-500">Selección preparada a partir de anuncios consultados o en caché. Comprueba su disponibilidad y precio en el anuncio; el score expresa encaje con el perfil, no una tasación.</p>
            </>}
          </article>)}</div>
        </section>
      </div>
    </main>
  </>;
}
