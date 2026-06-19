import { FALLBACK_IPV, FALLBACK_PRICE_BY_PROVINCE } from "./fixtures";
import type { IneIpvQuarterly, InePriceByProvince, IpvQuarterPoint } from "./types";

/**
 * Cliente del servicio JSON del INE (WS-Tempus).
 * Documentación: https://www.ine.es/dyngs/DAB/index.htm?cid=1100
 *
 * Estos endpoints son lentos y a veces devuelven 503; nunca se llaman desde
 * la ruta del chat. Solo desde el cron diario o como bootstrap.
 */

const INE_BASE = "https://servicios.ine.es/wstempus/js/ES";

/**
 * Tabla 25171: IPV trimestral, variación anual, vivienda libre, total nacional.
 * Devolvemos los últimos 4 trimestres para que Claude pueda explicar la tendencia.
 */
export async function fetchIneIpvQuarterly(): Promise<IneIpvQuarterly> {
  try {
    const res = await fetch(`${INE_BASE}/DATOS_TABLA/25171?nult=4&tip=AM`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`INE 25171 ${res.status}`);
    const json = (await res.json()) as IneSeriesPayload[];

    const total = json.find((s) =>
      s.Nombre?.toLowerCase().includes("variación anual") &&
      s.Nombre?.toLowerCase().includes("general")
    );
    if (!total?.Data?.length) throw new Error("INE 25171: serie no encontrada");

    const serie: IpvQuarterPoint[] = total.Data
      .slice(-4)
      .map((d) => ({
        periodo: formatIneQuarter(d.NombrePeriodo, d.Anyo),
        variacionInteranual: roundOne(d.Valor ?? 0),
      }));

    return {
      fuente: "INE — Índice de Precios de la Vivienda (tabla 25171)",
      serie,
    };
  } catch (err) {
    console.warn("[market/ine] IPV refresh failed, using fallback", err);
    return FALLBACK_IPV;
  }
}

/**
 * Precio €/m² de vivienda libre por provincia. El INE no expone una tabla
 * directa con €/m², solo índices y valoraciones del Ministerio de Vivienda.
 * Mantenemos el fallback como fuente principal y queda preparado para sustituirlo
 * cuando integremos el dataset CSV del Mitma o de la Estadística Registral.
 */
export async function fetchInePriceByProvince(): Promise<InePriceByProvince> {
  // TODO: cuando dispongamos del CSV del Ministerio de Vivienda, parsearlo aquí.
  return FALLBACK_PRICE_BY_PROVINCE;
}

interface IneSeriesPayload {
  Nombre?: string;
  Data?: Array<{ Anyo?: number; NombrePeriodo?: string; Valor?: number }>;
}

function formatIneQuarter(nombre: string | undefined, anyo: number | undefined): string {
  if (!nombre || !anyo) return `${anyo ?? ""}`;
  const m = nombre.match(/T(\d)/i);
  if (m) return `${anyo}T${m[1]}`;
  return `${anyo} ${nombre}`;
}

function roundOne(n: number) {
  return Math.round(n * 10) / 10;
}
