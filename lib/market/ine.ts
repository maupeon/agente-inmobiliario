import { FALLBACK_IPV } from "./fixtures";
import { fetchMitmaPriceByProvince } from "./mitma";
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
      cache: "no-store", signal: AbortSignal.timeout(8000),
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
        variacionInteranual: typeof d.Valor === "number" ? roundOne(d.Valor) : NaN,
      }));

    if (serie.length !== 4 || new Set(serie.map((d) => d.periodo)).size !== 4 || serie.some((d) => !/^\d{4}T[1-4]$/.test(d.periodo) || !Number.isFinite(d.variacionInteranual))) throw new Error("Serie trimestral incompleta o ambigua");
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
 * Precio €/m² de vivienda libre por provincia. El INE NO publica €/m² (solo el
 * IPV índice), así que la fuente oficial en euros es MITMA — Valor Tasado. Se
 * descarga y parsea en `./mitma`; ante cualquier fallo cae al fixture.
 */
export async function fetchInePriceByProvince(): Promise<InePriceByProvince> {
  return fetchMitmaPriceByProvince();
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
