import { FALLBACK_MORTGAGE_RATES } from "./fixtures";
import type { BdeMortgageRates } from "./types";

// Enlaces publicados en https://www.bde.es/webbe/es/estadisticas/temas/tipos-interes.html
const BDE_CSV = "https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv";
const MORTGAGE_SERIES = "DN_1TI2T0002"; // BE_19_4.2: TEDR vivienda, nuevas operaciones, tipo medio ponderado.
const EURIBOR_SERIES = "D_1NBAF472"; // BE_19_1.5: Euríbor a 12 meses.
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export async function fetchBdeMortgageRates(): Promise<BdeMortgageRates> {
  try {
    const [tedr, euribor] = await Promise.all([
      fetchBdeSeries(`${BDE_CSV}/be1904.csv`, MORTGAGE_SERIES),
      fetchBdeSeries(`${BDE_CSV}/be1901.csv`, EURIBOR_SERIES).catch(() => null),
    ]);
    if (!tedr) throw new Error("BdE: falta la serie TEDR de crédito a la vivienda");
    return {
      periodo: tedr.periodo,
      fuente: `Banco de España — ${MORTGAGE_SERIES} (TEDR vivienda) y ${EURIBOR_SERIES} (Euríbor 12 meses)`,
      tipoMedio: round(tedr.valor, 2),
      euribor12m: euribor ? round(euribor.valor, 3) : undefined,
      euriborPeriodo: euribor?.periodo,
    };
  } catch (err) {
    console.warn("[market/bde] mortgage refresh failed, using fallback", err);
    return FALLBACK_MORTGAGE_RATES;
  }
}

interface BdePoint {
  periodo: string;
  valor: number;
}

async function fetchBdeSeries(url: string, code: string): Promise<BdePoint | null> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`BdE ${res.status}`);
  // Los CSV del boletín usan Windows-1252, comas y punto decimal.
  const csv = new TextDecoder("windows-1252").decode(await res.arrayBuffer());
  return parseBdeSeries(csv, code);
}

/** Selección por código estable, nunca por posición de columna o último valor cualquiera. */
export function parseBdeSeries(csv: string, code: string): BdePoint | null {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const header = lines[0]?.split(",").map(unquote);
  if (!header || header[0] !== "CÓDIGO DE LA SERIE") return null;
  const indexes = header.flatMap((value, index) => value === code ? [index] : []);
  if (indexes.length !== 1) return null;
  const column = indexes[0];
  let latest: BdePoint | null = null;
  for (const line of lines.slice(1)) {
    // Solo las observaciones mensuales tienen datos simples; la metadata puede contener comas entrecomilladas.
    if (!/^"[A-Z]{3} \d{4}",/.test(line)) continue;
    const cells = line.split(",").map(unquote);
    if (cells.length !== header.length) continue;
    const match = cells[0].match(/^([A-Z]{3}) (\d{4})$/);
    const month = match ? MONTHS.indexOf(match[1]) : -1;
    const raw = cells[column];
    if (!match || month < 0 || !/^-?\d+(?:\.\d+)?$/.test(raw)) continue;
    const valor = Number(raw);
    if (!Number.isFinite(valor)) continue;
    const periodo = `${match[2]}-${String(month + 1).padStart(2, "0")}`;
    if (!latest || periodo > latest.periodo) latest = { periodo, valor };
  }
  return latest;
}

function unquote(value: string): string {
  return value.trim().replace(/^"|"$/g, "");
}

function round(n: number, decimals: number): number {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
}
