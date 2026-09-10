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
 * Devolvemos el histórico desde 2018 y niveles de la misma serie para indexación.
 */
export async function fetchIneIpvQuarterly(): Promise<IneIpvQuarterly> {
  try {
    const res = await fetch(`${INE_BASE}/DATOS_TABLA/25171?nult=${Math.max(40, (new Date().getFullYear() - 2018 + 1) * 4)}&tip=AM`, {
      headers: { accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`INE 25171 ${res.status}`);
    const json = (await res.json()) as IneSeriesPayload[];

    const total = json.find((s) => /^Nacional\.\s*General\.\s*Variación anual\./i.test(s.Nombre?.trim() ?? ""));
    if (!total?.Data?.length) throw new Error("INE 25171: serie no encontrada");

    const indices = json.filter((s) => /^Nacional\.\s*General\.\s*Índice\./i.test(s.Nombre?.trim() ?? ""));
    if (indices.length !== 1) throw new Error("Índice nacional ausente o ambiguo");
    const levels = new Map<string, number>();
    for (const d of indices[0].Data ?? []) {
      const quarter = formatIneQuarter(d.T3_Periodo ?? d.NombrePeriodo, d.Anyo);
      if (!/^\d{4}T[1-4]$/.test(quarter) || typeof d.Valor !== "number" || !Number.isFinite(d.Valor) || d.Valor <= 0 || levels.has(quarter)) throw new Error("Índice inválido");
      levels.set(quarter, d.Valor);
    }
    const serie: IpvQuarterPoint[] = total.Data
      .map((d) => ({
        periodo: formatIneQuarter(d.T3_Periodo ?? d.NombrePeriodo, d.Anyo),
        indice: levels.get(formatIneQuarter(d.T3_Periodo ?? d.NombrePeriodo, d.Anyo)),
        variacionInteranual: typeof d.Valor === "number" ? roundOne(d.Valor) : NaN,
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .filter((d) => d.periodo >= "2018T1");

    if (serie.length < 4 || new Set(serie.map((d) => d.periodo)).size !== serie.length || serie.some((d) => !/^\d{4}T[1-4]$/.test(d.periodo) || !Number.isFinite(d.variacionInteranual) || d.indice == null)) throw new Error("Serie trimestral incompleta o ambigua");
    const base = serie.filter((d) => d.periodo.startsWith("2018T"));
    if (base.length !== 4) throw new Error("Falta la base completa de 2018");
    for (let i = 1; i < serie.length; i++) {
      const n = (p: string) => Number(p.slice(0, 4)) * 4 + Number(p.at(-1));
      if (n(serie[i].periodo) !== n(serie[i - 1].periodo) + 1) throw new Error("Hueco en el histórico IPV");
    }
    const madrid = json.filter((s) => /^Madrid, Comunidad de\.\s*Vivienda segunda mano\.\s*Índice\./i.test(s.Nombre?.trim() ?? ""));
    if (madrid.length !== 1) throw new Error("Índice de Madrid segunda mano ausente o ambiguo");
    const madridSerie = (madrid[0].Data ?? []).map((d) => ({ periodo: formatIneQuarter(d.T3_Periodo ?? d.NombrePeriodo, d.Anyo), indice: d.Valor as number }))
      .filter((d) => d.periodo >= "2018T1").sort((a, b) => a.periodo.localeCompare(b.periodo));
    if (madridSerie.length !== serie.length || madridSerie.some((d, i) => d.periodo !== serie[i].periodo || !Number.isFinite(d.indice) || d.indice <= 0)) throw new Error("Histórico de Madrid incompleto");
    const madridBase = madridSerie.filter((d) => d.periodo.startsWith("2018T"));
    return {
      madridSegundaMano: { base2018: madridBase.reduce((sum, d) => sum + d.indice, 0) / 4, serie: madridSerie },
      schemaVersion: 2,
      base2018: base.reduce((sum, d) => sum + d.indice!, 0) / 4,
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
  Data?: Array<{ Anyo?: number; T3_Periodo?: string; NombrePeriodo?: string; Valor?: number }>;
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
