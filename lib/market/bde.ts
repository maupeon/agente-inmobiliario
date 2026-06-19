import { FALLBACK_MORTGAGE_RATES } from "./fixtures";
import type { BdeMortgageRates } from "./types";

/**
 * Tipos hipotecarios desde el Banco de España.
 *
 * El BdE expone series temporales como CSV en URLs estables del tipo
 *   https://www.bde.es/webbde/es/estadis/infoest/series/{codigo}.csv
 *
 * - be1903: TEDR ponderada de préstamos a hogares para vivienda (nuevas operaciones).
 * - be1304: Euribor a 12 meses (media mensual).
 *
 * El parser es defensivo: cualquier fallo de red/formato cae al fallback.
 */

const BDE_BASE = "https://www.bde.es/webbde/es/estadis/infoest/series";

export async function fetchBdeMortgageRates(): Promise<BdeMortgageRates> {
  try {
    const [tedr, euribor] = await Promise.all([
      fetchBdeSeries(`${BDE_BASE}/be1903.csv`),
      fetchBdeSeries(`${BDE_BASE}/be1304.csv`),
    ]);

    if (!tedr) throw new Error("BdE: TEDR vacío");

    return {
      periodo: tedr.periodo,
      fuente: "Banco de España — series be1903 (TEDR vivienda) y be1304 (Euribor 12m)",
      tipoMedio: round(tedr.valor, 2),
      euribor12m: euribor ? round(euribor.valor, 2) : undefined,
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

/**
 * El CSV del BdE tiene cabecera variable y separador `;`. Buscamos la última
 * fila con valor numérico y devolvemos `(periodo, valor)`. Cualquier formato
 * inesperado se trata como ausencia de dato.
 */
async function fetchBdeSeries(url: string): Promise<BdePoint | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`BdE ${url} ${res.status}`);
  const text = await res.text();

  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(";").map((c) => c.trim()));

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.length < 2) continue;
    const periodo = row[0];
    const raw = row[row.length - 1].replace(",", ".");
    const valor = Number(raw);
    if (!Number.isFinite(valor)) continue;
    if (!/^\d{4}/.test(periodo)) continue;
    return { periodo, valor };
  }
  return null;
}

function round(n: number, decimals: number) {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
}
