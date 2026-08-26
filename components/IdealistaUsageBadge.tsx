"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Usage {
  count: number | null;
  limit: number;
  remaining: number | null;
  available: boolean;
  mock: boolean;
}

/**
 * Indicador del consumo mensual registrado de la API de Idealista.
 * Sondea `/api/idealista-usage` al montar, cada 20 s y al volver a la pestaña.
 * En modo simulado muestra "mock" (no gasta cuota).
 */
export function IdealistaUsageBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [u, setU] = useState<Usage | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = () =>
      fetch("/api/idealista-usage", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d) setU(d as Usage);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 20_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!u) return null;

  const base =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]";

  if (u.mock) {
    return (
      <output
        title="Idealista está en modo simulado y no consume cuota real"
        className={cn(base, "border-hairline text-mist", className)}
      >
        {compact ? "Idealista mock" : "Idealista · modo mock"}
      </output>
    );
  }

  if (!u.available || u.remaining === null || u.count === null) {
    return (
      <output
        title="No se pudo consultar en Supabase el consumo de Idealista"
        className={cn(base, "border-hairline text-stone", className)}
      >
        {compact ? "Idealista · —" : "Idealista · sin datos"}
      </output>
    );
  }

  const out = u.remaining === 0;
  const low = u.remaining <= Math.max(10, Math.ceil(u.limit * 0.1));
  return (
    <output
      aria-live="polite"
      title={`${u.remaining} peticiones disponibles de ${u.limit} este mes (${u.count} utilizadas)`}
      className={cn(
        base,
        out
          ? "border-saffron-500 bg-saffron-100 text-saffron-700"
          : low
            ? "border-saffron-300 bg-saffron-50 text-ink"
            : "border-hairline text-stone",
        className
      )}
    >
      {compact
        ? `Idealista · ${u.remaining}`
        : out
          ? "Idealista · sin peticiones"
          : `Idealista · ${u.remaining} restantes`}
    </output>
  );
}
