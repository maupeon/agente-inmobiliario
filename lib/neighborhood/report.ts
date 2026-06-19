import type { NeighborhoodReport, QolIndicator } from "@/types";
import {
  NEIGHBORHOOD_FIXTURES,
  NEIGHBORHOOD_PROVINCE_FIXTURES,
  type NeighborhoodFixture,
  type NeighborhoodProvinceFixture,
} from "./fixtures";

const FUENTE_SEGURIDAD =
  "Ministerio del Interior — Balance de Criminalidad (compuesto orientativo)";
const FUENTE_CALIDAD =
  "Indicadores de calidad de vida (transporte, zonas verdes, servicios; compuesto orientativo)";

/**
 * Construye el informe de barrio (seguridad + calidad de vida) a partir de los
 * datos curados. Empareja primero por barrio/distrito y, si no, por provincia.
 */
export function buildNeighborhoodReport(
  zona: string,
  provincia?: string
): NeighborhoodReport {
  const norm = normalize(zona);

  const zoneHit =
    NEIGHBORHOOD_FIXTURES.find((z) => normalize(z.zona) === norm) ??
    NEIGHBORHOOD_FIXTURES.find(
      (z) => norm.includes(normalize(z.zona)) || normalize(z.zona).includes(norm)
    );

  if (zoneHit) {
    return compose(zona, zoneHit.zona, "barrio", false, zoneHit);
  }

  const provNeedle = provincia ? normalize(provincia) : norm;
  const provHit =
    NEIGHBORHOOD_PROVINCE_FIXTURES.find((p) => normalize(p.provincia) === provNeedle) ??
    NEIGHBORHOOD_PROVINCE_FIXTURES.find(
      (p) =>
        provNeedle.includes(normalize(p.provincia)) ||
        normalize(p.provincia).includes(provNeedle)
    );

  if (provHit) {
    return compose(zona, provHit.provincia, "provincia", true, provHit);
  }

  // Sin datos: devolvemos un informe vacío honesto.
  return {
    zona: { consultada: zona, encontrada: null, nivel: null },
    seguridad: { indice: null, etiqueta: null, tasaCriminalidad: null },
    calidadVida: { indiceGlobal: null, indicadores: [] },
    resumen: null,
    fuentes: { seguridad: FUENTE_SEGURIDAD, calidadVida: FUENTE_CALIDAD },
    actualizado: null,
    fromFallback: true,
    aproximado: true,
  };
}

function compose(
  consultada: string,
  encontrada: string,
  nivel: "barrio" | "provincia",
  fromFallback: boolean,
  f: NeighborhoodFixture | NeighborhoodProvinceFixture
): NeighborhoodReport {
  const indicadores: QolIndicator[] = [
    { clave: "transporte", etiqueta: "Transporte", valor: f.transporte },
    { clave: "zonas_verdes", etiqueta: "Zonas verdes", valor: f.zonasVerdes },
    { clave: "servicios", etiqueta: "Servicios", valor: f.servicios },
    { clave: "vida_nocturna", etiqueta: "Vida nocturna", valor: f.vidaNocturna },
    { clave: "tranquilidad", etiqueta: "Tranquilidad", valor: f.tranquilidad },
  ];

  // El índice global pondera "habitabilidad": transporte, verde, servicios y
  // tranquilidad. La vida nocturna se muestra pero no entra (es de doble filo).
  const indiceGlobal = Math.round(
    (f.transporte + f.zonasVerdes + f.servicios + f.tranquilidad) / 4
  );

  return {
    zona: { consultada, encontrada, nivel },
    seguridad: {
      indice: f.seguridad,
      etiqueta: safetyLabel(f.seguridad),
      tasaCriminalidad: f.tasaCriminalidad,
    },
    calidadVida: { indiceGlobal, indicadores },
    resumen: summarize(encontrada, nivel, f, indiceGlobal),
    fuentes: { seguridad: FUENTE_SEGURIDAD, calidadVida: FUENTE_CALIDAD },
    actualizado: null,
    fromFallback,
    aproximado: true,
  };
}

function safetyLabel(score: number): string {
  if (score >= 80) return "muy segura";
  if (score >= 70) return "segura";
  if (score >= 60) return "tranquila en general, con incidencias puntuales";
  if (score >= 50) return "con cierta inseguridad, sobre todo de noche";
  return "con más incidencias de lo habitual";
}

function summarize(
  nombre: string,
  nivel: "barrio" | "provincia",
  f: NeighborhoodFixture | NeighborhoodProvinceFixture,
  indiceGlobal: number
): string {
  const fuertes: string[] = [];
  if (f.transporte >= 82) fuertes.push("muy bien comunicada");
  if (f.zonasVerdes >= 75) fuertes.push("con bastante verde");
  if (f.servicios >= 85) fuertes.push("con todos los servicios a mano");
  if (f.vidaNocturna >= 82) fuertes.push("con mucha vida nocturna");
  if (f.tranquilidad >= 72) fuertes.push("tranquila");

  const ambito = nivel === "barrio" ? nombre : `la provincia de ${nombre}`;
  const fortaleza = fuertes.length
    ? `Destaca por ser ${fuertes.slice(0, 2).join(" y ")}.`
    : "";
  const aviso =
    f.tranquilidad < 50
      ? " Es una zona animada, así que puede tener ruido por la noche."
      : f.seguridad < 62
      ? " Conviene cuidar las pertenencias, sobre todo de noche."
      : "";

  return `Calidad de vida estimada en ${ambito}: ${indiceGlobal}/100. ${fortaleza}${aviso}`.trim();
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
