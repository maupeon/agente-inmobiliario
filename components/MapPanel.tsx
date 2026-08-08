"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MODE_LABEL, bandaColor, safetyColor } from "@/lib/dashboard-format";
import { formatEUR } from "@/lib/utils";
import type { CommuteResult, Property, PropertyEnrichment } from "@/types";

/** Estilo vectorial gratuito de CARTO (sin clave). Tono claro, encaja con paper. */
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
/** Centro de respaldo: Puerta del Sol, Madrid. */
const FALLBACK_CENTER = { longitude: -3.7038, latitude: 40.4168, zoom: 11 };

export interface MapItem {
  property: Property;
  enrichment?: PropertyEnrichment | null;
}

interface MapPanelProps {
  items: MapItem[];
  work?: { lat: number; lon: number; label: string } | null;
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  showSafety: boolean;
  showTrajectory: boolean;
}

export default function MapPanel({
  items,
  work,
  selectedCode,
  onSelect,
  showSafety,
  showTrajectory,
}: MapPanelProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const plotted = useMemo(
    () => items.filter((it) => it.property.latitude != null && it.property.longitude != null),
    [items]
  );
  const selected =
    plotted.find((it) => it.property.propertyCode === selectedCode) ?? null;

  const safetyData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: plotted.flatMap((it) => {
        const indice = it.enrichment?.neighborhood?.seguridad.indice;
        if (indice == null) return [];
        return [
          {
            type: "Feature" as const,
            properties: { color: safetyColor(indice) },
            geometry: {
              type: "Point" as const,
              coordinates: [it.property.longitude!, it.property.latitude!],
            },
          },
        ];
      }),
    }),
    [plotted]
  );

  const trajectory = useMemo(() => {
    const geo = selected?.enrichment?.commute?.rutaGeo;
    if (!geo || geo.geometria.length < 2) return null;
    const data: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: geo.geometria },
    };
    return { aprox: geo.aprox, data };
  }, [selected]);

  const initialViewState = useMemo(() => {
    const first = plotted[0]?.property;
    if (first?.longitude != null && first?.latitude != null) {
      return { longitude: first.longitude, latitude: first.latitude, zoom: 12 };
    }
    return FALLBACK_CENTER;
  }, [plotted]);

  const codesKey = plotted.map((it) => it.property.propertyCode).join(",");

  function fitToData() {
    const map = mapRef.current;
    if (!map) return;
    const pts: Array<[number, number]> = plotted.map((it) => [
      it.property.longitude!,
      it.property.latitude!,
    ]);
    if (work) pts.push([work.lon, work.lat]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 13.5, duration: reduceMotion ? 0 : 600 });
      return;
    }
    let minLon = pts[0][0],
      minLat = pts[0][1],
      maxLon = pts[0][0],
      maxLat = pts[0][1];
    for (const [lon, lat] of pts) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 64, maxZoom: 14, duration: reduceMotion ? 0 : 600 }
    );
  }

  // Reencuadra cuando cambia el conjunto de pisos o el trabajo.
  useEffect(() => {
    fitToData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesKey, work?.lat, work?.lon]);

  // Centra en el piso seleccionado.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo({
      center: [selected.property.longitude!, selected.property.latitude!],
      zoom: Math.max(map.getZoom(), 13),
      duration: reduceMotion ? 0 : 500,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCode]);

  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      mapStyle={MAP_STYLE}
      onLoad={fitToData}
      onClick={() => onSelect(null)}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {showSafety && safetyData.features.length > 0 && (
        <Source id="safety" type="geojson" data={safetyData}>
          <Layer {...SAFETY_LAYER} />
        </Source>
      )}

      {showTrajectory && trajectory && (
        <Source id="trajectory" type="geojson" data={trajectory.data}>
          <Layer {...(trajectory.aprox ? TRAJECTORY_DASHED : TRAJECTORY_SOLID)} />
        </Source>
      )}

      {plotted.map((it) => {
        const code = it.property.propertyCode;
        const color = bandaColor(it.enrichment?.valuation?.banda);
        const isSel = code === selectedCode;
        return (
          <Marker
            key={code}
            longitude={it.property.longitude!}
            latitude={it.property.latitude!}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(isSel ? null : code);
            }}
          >
            <button
              type="button"
              aria-label={it.property.title}
              aria-pressed={isSel}
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full"
            >
              <span
                aria-hidden
                className="block rounded-full border-2 border-paper-50 transition-all"
                style={{
                  width: isSel ? 22 : 16,
                  height: isSel ? 22 : 16,
                  background: color,
                  boxShadow: isSel
                    ? `0 0 0 4px ${color}33, 0 1px 3px rgba(0,0,0,0.35)`
                    : "0 1px 3px rgba(0,0,0,0.35)",
                }}
              />
            </button>
          </Marker>
        );
      })}

      {work && (
        <Marker longitude={work.lon} latitude={work.lat} anchor="center">
          <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-ink bg-ink px-2 text-xs font-medium text-paper shadow">
            <span className="text-saffron-300">◆</span> Trabajo
          </div>
        </Marker>
      )}

      {selected && (
        <Popup
          longitude={selected.property.longitude!}
          latitude={selected.property.latitude!}
          anchor="bottom"
          offset={18}
          closeButton={false}
          closeOnClick={false}
          maxWidth="240px"
        >
          <div className="font-sans">
            <p className="font-display text-sm leading-tight text-ink">
              {selected.property.title}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-stone">
              {formatEUR(selected.property.price)}
              {selected.property.operation === "rent" ? "/mes" : ""}
            </p>
            {selected.enrichment?.commute?.recomendado && (
              <p className="mt-1 text-[11px] text-ink-700">
                {legMinutes(selected.enrichment.commute)} min{" "}
                {MODE_LABEL[selected.enrichment.commute.recomendado]} al trabajo
              </p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}

function legMinutes(c: CommuteResult): number | string {
  const leg = c.modos.find((m) => m.modo === c.recomendado);
  return leg?.minutos ?? "—";
}

const SAFETY_LAYER: LayerProps = {
  id: "safety-fill",
  type: "circle",
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 14, 38],
    "circle-color": ["get", "color"],
    "circle-opacity": 0.16,
    "circle-stroke-color": ["get", "color"],
    "circle-stroke-opacity": 0.5,
    "circle-stroke-width": 1,
  },
};

const TRAJECTORY_SOLID: LayerProps = {
  id: "trajectory-line",
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": "#176547", "line-width": 3.5, "line-opacity": 0.9 },
};

const TRAJECTORY_DASHED: LayerProps = {
  id: "trajectory-line",
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": "#176547",
    "line-width": 3,
    "line-opacity": 0.85,
    "line-dasharray": [1.5, 1.5],
  },
};
