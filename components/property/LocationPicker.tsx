"use client";
import { useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const SPAIN = { lat: 40.2, lon: -3.6, zoom: 4.7 };

export interface PickedLocation {
  lat: number;
  lon: number;
  label: string;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  searchPlaceholder?: string;
  /** Centro inicial si aún no hay valor. */
  defaultCenter?: { lat: number; lon: number; zoom?: number };
  /** Color del pin (verde HabitIA para la zona, ink para el trabajo, p. ej.). */
  accent?: string;
  heightClass?: string;
}

export default function LocationPicker({
  value,
  onChange,
  searchPlaceholder = "Busca una zona o dirección…",
  defaultCenter,
  accent = "#176547",
  heightClass = "h-[300px]",
}: LocationPickerProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(
    value ? { lat: value.lat, lon: value.lon } : null
  );
  const [error, setError] = useState<string | null>(null);

  const initialViewState = value
    ? { longitude: value.lon, latitude: value.lat, zoom: 13 }
    : defaultCenter
    ? { longitude: defaultCenter.lon, latitude: defaultCenter.lat, zoom: defaultCenter.zoom ?? 11 }
    : { longitude: SPAIN.lon, latitude: SPAIN.lat, zoom: SPAIN.zoom };

  async function resolveAt(lat: number, lon: number) {
    setPos({ lat, lon });
    setResolving(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      const { result } = (await res.json()) as { result: { label: string | null } | null };
      onChange({ lat, lon, label: result?.label ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
    } catch {
      onChange({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
    } finally {
      setResolving(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const { result } = (await res.json()) as {
        result: { lat: number; lon: number; label?: string } | null;
      };
      if (result) {
        setPos({ lat: result.lat, lon: result.lon });
        onChange({ lat: result.lat, lon: result.lon, label: result.label ?? q });
        mapRef.current?.flyTo({ center: [result.lon, result.lat], zoom: 13, duration: 700 });
      } else {
        setError("No he encontrado ese sitio. Prueba otra búsqueda o haz clic en el mapa.");
      }
    } catch {
      setError("No he podido buscar ahora mismo. Haz clic en el mapa.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={15}
            weight="bold"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-hairline bg-paper-50 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-mist transition focus:border-ink/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-ink px-4 py-2.5 text-sm text-paper transition hover:bg-ink-700 active:scale-[0.98] disabled:opacity-50"
        >
          {searching ? "…" : "Buscar"}
        </button>
      </form>

      <div className={cn("relative mt-2 overflow-hidden rounded-lg border border-hairline", heightClass)}>
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={MAP_STYLE}
          onClick={(e) => resolveAt(e.lngLat.lat, e.lngLat.lng)}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {pos && (
            <Marker
              longitude={pos.lon}
              latitude={pos.lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => resolveAt(e.lngLat.lat, e.lngLat.lng)}
            >
              <MapPin size={32} weight="fill" style={{ color: accent }} className="drop-shadow" />
            </Marker>
          )}
        </Map>
        {!pos && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent px-3 pb-2.5 pt-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-paper">
            Haz clic en el mapa para fijar el punto
          </div>
        )}
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-sm">
        {resolving ? (
          <span className="animate-pulse-soft font-mono text-[11px] uppercase tracking-[0.16em] text-stone">
            Resolviendo ubicación…
          </span>
        ) : value ? (
          <>
            <MapPin size={14} weight="fill" style={{ color: accent }} />
            <span className="text-ink">{value.label}</span>
          </>
        ) : (
          <span className="text-stone">Busca arriba o toca el mapa para elegir.</span>
        )}
      </p>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
