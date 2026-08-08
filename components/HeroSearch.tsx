"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Operation = "alquiler" | "venta";

const POPULAR_ZONES = ["Madrid", "Barcelona", "Valencia"];

export function HeroSearch() {
  const router = useRouter();
  const [operation, setOperation] = useState<Operation>("alquiler");
  const [zone, setZone] = useState("");
  const [error, setError] = useState(false);

  function launchSearch() {
    const cleanZone = zone.trim();
    if (!cleanZone) {
      setError(true);
      return;
    }

    const params = new URLSearchParams({ zona: cleanZone, operacion: operation });
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        launchSearch();
      }}
      className="glass-surface mt-9 w-full max-w-[700px] rounded-2xl p-2.5 sm:p-3"
      aria-label="Buscar vivienda"
    >
      <fieldset>
        <legend className="sr-only">Tipo de operación</legend>
        <div className="inline-flex rounded-xl bg-paper-200 p-1" role="group">
          {(["alquiler", "venta"] as const).map((item) => {
            const selected = operation === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => setOperation(item)}
                className={cn(
                  "pressable min-h-11 rounded-lg px-5 text-sm font-medium",
                  selected
                    ? "bg-paper-50 text-ink shadow-nudge"
                    : "text-stone-600 hover:text-ink"
                )}
              >
                {item === "alquiler" ? "Alquilar" : "Comprar"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr,auto]">
        <label className="relative block">
          <span className="sr-only">Barrio, ciudad o municipio</span>
          <MapPin
            aria-hidden
            size={20}
            weight="fill"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-saffron-700"
          />
          <input
            value={zone}
            onChange={(event) => {
              setZone(event.target.value);
              if (error) setError(false);
            }}
            autoComplete="address-level2"
            placeholder="Barrio, ciudad o municipio"
            aria-invalid={error}
            aria-describedby={error ? "hero-search-error" : undefined}
            className={cn(
              "h-14 w-full rounded-xl border bg-paper-50 pl-12 pr-4 text-base text-ink shadow-nudge placeholder:text-stone-400 focus:outline-none",
              error ? "border-rose-500" : "border-hairline"
            )}
          />
        </label>

        <button
          type="submit"
          className="pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-ink px-6 font-medium text-paper shadow-lift hover:bg-ink-700"
        >
          <MagnifyingGlass aria-hidden size={18} weight="bold" className="text-saffron-300" />
          Buscar viviendas
        </button>
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 px-2 pt-2.5 text-sm text-stone">
        {error ? (
          <p id="hero-search-error" role="alert" className="text-rose-500">
            Escribe una zona para empezar.
          </p>
        ) : (
          <>
            <span className="mr-1 text-stone-600">Zonas populares:</span>
            {POPULAR_ZONES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setZone(item);
                  setError(false);
                }}
                className="pressable rounded-full px-2 py-1 text-saffron-700 hover:bg-saffron-50"
              >
                {item}
              </button>
            ))}
          </>
        )}
      </div>
    </form>
  );
}
