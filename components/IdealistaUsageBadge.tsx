"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Usage {
  count: number;
  limit: number;
  remaining: number;
  mock: boolean;
}

/**
 * Indicador del consumo mensual de la API de Idealista (plan gratuito: 100/mes).
 * Sondea `/api/idealista-usage` al montar, cada 20 s y al volver a la pestaña.
 * En modo simulado muestra "mock" (no gasta cuota).
 */
export function IdealistaUsageBadge() {
  const [u, setU] = useState<Usage | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/idealista-usage")
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
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!u) return null;

  const base =
    "shrink-0 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]";

  if (u.mock) {
    return (
      <span title="Idealista en modo simulado: no consume cuota real" className={cn(base, "border-hairline text-mist")}>
        Idealista · mock
      </span>
    );
  }

  const out = u.remaining <= 0;
  const low = u.remaining <= 10;
  return (
    <span
      title={`Peticiones reales a Idealista este mes — plan gratuito de ${u.limit}`}
      className={cn(
        base,
        out
          ? "border-saffron-500 bg-saffron-100 text-saffron-700"
          : low
            ? "border-saffron-300 bg-saffron-50 text-ink"
            : "border-hairline text-stone"
      )}
    >
      Idealista {u.count}/{u.limit}
      {out ? " · tope" : ""}
    </span>
  );
}
