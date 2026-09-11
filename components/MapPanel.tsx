"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MODE_LABEL, bandaColor } from "@/lib/dashboard-format";
import styles from "./MapPanel.module.css";
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
  showTrajectory: boolean;
}

export default function MapPanel({
  items,
  work,
  selectedCode,
  onSelect,
  showTrajectory,
}: MapPanelProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [loaded, setLoaded] = useState(false);
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

  // El encuadre incluye todo el trayecto y deja espacio para la ficha flotante.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selected) return;
    map.stop();
    const coords = showTrajectory && trajectory
      ? (trajectory.data.geometry as GeoJSON.LineString).coordinates : [];
    const points = [[selected.property.longitude!, selected.property.latitude!], ...coords];
    if (showTrajectory && trajectory && work) points.push([work.lon, work.lat]);
    if (points.length > 1) {
      map.fitBounds([
        [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))],
        [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))],
      ], { padding: { top: 85, bottom: 270, left: 60, right: 60 }, maxZoom: 14.5, duration: reduceMotion ? 0 : 650 });
    } else {
      map.easeTo({ center: points[0] as [number, number], zoom: Math.max(map.getZoom(), 13),
        offset: [0, -65], duration: reduceMotion ? 0 : 450 });
    }
  }, [selected, showTrajectory, trajectory, work, reduceMotion, loaded]);

  return (
    <div className={styles.root} data-has-selection={!!selected}>
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      mapStyle={MAP_STYLE}
      onLoad={() => { setLoaded(true); fitToData(); }}
      onClick={() => onSelect(null)}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {showTrajectory && trajectory && (
        <AnimatedRoute key={selectedCode} trajectory={trajectory} reduceMotion={reduceMotion} />
      )}

      {plotted.map((it) => {
        const code = it.property.propertyCode;
        const v = it.enrichment?.valuation;
        const color = bandaColor(v?.nivel === "modelo" && v.estadoModelo === "ok" && !v.fromFallback ? v.banda : null);
        const isSel = code === selectedCode;
        return (
          <Marker
            key={code}
            longitude={it.property.longitude!}
            latitude={it.property.latitude!}
            anchor="center"
            style={{ zIndex: isSel ? 3 : 1 }}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(isSel ? null : code);
            }}
          >
            <button
              type="button"
              aria-label={`${it.property.title}, ${formatEUR(it.property.price)}`}
              aria-pressed={isSel}
              className={styles.pin}
              data-selected={isSel}
              style={{ "--pin-color": color } as React.CSSProperties}
            >
              <span className={styles.pinDot} aria-hidden />
              <span className={styles.pinPrice}>{formatEUR(it.property.price)}{it.property.operation === "rent" ? "/mes" : ""}</span>
            </button>
          </Marker>
        );
      })}

      {work && (
        <Marker longitude={work.lon} latitude={work.lat} anchor="center">
          <div className={styles.work} title={work.label}>
            <span className="text-saffron-300">◆</span> Trabajo
          </div>
        </Marker>
      )}

    </Map>
    <div className={styles.toolbar}>
      <div className={styles.mapLabel}><span className={styles.eyebrow}>EXPLORA MADRID</span><strong>{plotted.length} viviendas en el mapa</strong></div>
      <button className={styles.overview} onClick={() => { onSelect(null); fitToData(); }} aria-label="Ver todas las viviendas en el mapa">↗ <span>Ver todo</span></button>
    </div>
    {selected ? (
      <section className={styles.card} aria-label="Vivienda seleccionada" aria-live="polite">
        <div className={styles.cardHeader}>
          <div><span className={styles.eyebrow}>VIVIENDA SELECCIONADA</span><h3>{selected.property.title}</h3></div>
          <button className={styles.close} onClick={() => onSelect(null)} aria-label="Cerrar vivienda seleccionada">×</button>
        </div>
        <div className={styles.details}><strong>{formatEUR(selected.property.price)}{selected.property.operation === "rent" ? "/mes" : ""}</strong><span>{selected.property.size} m² · {selected.property.rooms ?? "—"} hab.</span></div>
        <div className={styles.commute}>
          <span className={styles.routeIcon} aria-hidden>↗</span>
          <div><strong>{selected.enrichment?.commute?.recomendado ? `${legMinutes(selected.enrichment.commute)} min ${MODE_LABEL[selected.enrichment.commute.recomendado]} al trabajo` : work ? "Trayecto no disponible" : "Añade tu trabajo para comparar trayectos"}</strong>
          <p>{showTrajectory && trajectory ? trajectory.aprox ? "Conexión aproximada · no representa las calles del recorrido" : "Recorrido al trabajo" : !showTrajectory && trajectory ? "Trayecto oculto en el mapa" : "Selecciona otra vivienda para comparar"}</p></div>
        </div>
      </section>
    ) : <div className={styles.hint}>Selecciona un precio para explorar la vivienda{work ? " y su trayecto" : ""}</div>}
    </div>
  );
}

/** Revelado por distancia: una ruta con pocos vértices tampoco aparece de golpe. */
function AnimatedRoute({ trajectory, reduceMotion }: { trajectory: { aprox: boolean; data: GeoJSON.Feature }; reduceMotion: boolean }) {
  const [data, setData] = useState(trajectory.data);
  useEffect(() => {
    if (reduceMotion) { setData(trajectory.data); return; }
    const points = (trajectory.data.geometry as GeoJSON.LineString).coordinates;
    const lengths = points.slice(1).map((p, i) => Math.hypot((p[0] - points[i][0]) * Math.cos(p[1] * Math.PI / 180), p[1] - points[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1100);
      let remaining = total * (1 - Math.pow(1 - progress, 3));
      const coordinates = [points[0]];
      for (let i = 0; i < lengths.length; i++) {
        if (remaining >= lengths[i]) { coordinates.push(points[i + 1]); remaining -= lengths[i]; }
        else { const t = lengths[i] ? remaining / lengths[i] : 1; coordinates.push(points[i].map((v, j) => v + (points[i + 1][j] - v) * t)); break; }
      }
      if (coordinates.length < 2) coordinates.push(points[0]);
      setData({ ...trajectory.data, geometry: { type: "LineString", coordinates } });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    tick(start);
    return () => cancelAnimationFrame(frame);
  }, [trajectory, reduceMotion]);
  return <Source id="trajectory" type="geojson" data={data}>
    <Layer id="trajectory-halo" type="line" layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#ffffff", "line-width": 9, "line-opacity": .85 }} />
    <Layer {...(trajectory.aprox ? TRAJECTORY_DASHED : TRAJECTORY_SOLID)} />
  </Source>;
}

function legMinutes(c: CommuteResult): number | string {
  const leg = c.modos.find((m) => m.modo === c.recomendado);
  return leg?.minutos ?? "—";
}

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
