import * as XLSX from "xlsx";
import { FALLBACK_PRICE_BY_PROVINCE } from "./fixtures";
import type { InePriceByProvince, ProvincePrice } from "./types";

/**
 * Precio €/m² de vivienda libre por provincia, fuente oficial:
 * Ministerio de Vivienda y Agenda Urbana (MIVAU) — "Valor tasado de
 * la vivienda libre". El INE no publica €/m² (solo el IPV índice), así que esta
 * es la referencia oficial en euros. El fichero `.XLS` se descarga directo y se
 * actualiza trimestralmente; ante cualquier fallo, caemos al fixture.
 */
const MITMA_XLS_URL = "https://apps.fomento.gob.es/boletinonline2/sedal/35101000.XLS";
const FUENTE = "MIVAU — Valor tasado de vivienda libre (€/m²)";

/** Filas agregadas (nacional / CCAA pluriprovincial) que NO son provincia. */
const SKIP = new Set([
  "total nacional", "andalucia", "aragon", "canarias", "castilla y leon",
  "castilla-la mancha", "cataluna", "comunidad valenciana", "extremadura",
  "galicia", "pais vasco", "ceuta y melilla",
]);

/** Nombre MITMA (normalizado) → nombre canónico que usa la app. */
const RENAME: Record<string, string> = {
  "balears (illes)": "Baleares",
  "palmas (las)": "Las Palmas",
  "coruna (a)": "La Coruña",
  "alicante/alacant": "Alicante",
  "castellon/castello": "Castellón",
  "valencia/valencia": "Valencia",
  "araba/alava": "Álava",
  "gipuzkoa": "Guipúzcoa",
  "bizkaia": "Vizcaya",
  "girona": "Gerona",
  "lleida": "Lérida",
  "ourense": "Orense",
  "madrid (comunidad de )": "Madrid",
  "murcia (region de )": "Murcia",
  "navarra (comunidad foral de )": "Navarra",
  "asturias (principado de )": "Asturias",
  "rioja (la)": "La Rioja",
};

export async function fetchMitmaPriceByProvince(): Promise<InePriceByProvince> {
  try {
    const res = await fetch(MITMA_XLS_URL, {
      headers: { "User-Agent": "HabitIA/1.0 (TFM)" },
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`MITMA ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    // Última hoja = cuatrienio más reciente.
    const sheet = wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];

    // Fila de cabecera con "Año 2026" etc., y la de trimestres dos filas debajo.
    let yearRow = -1;
    for (let i = 0; i < Math.min(24, rows.length); i++) {
      if ((rows[i] ?? []).some((c) => typeof c === "string" && /A[ñn]o\s*\d{4}/.test(c))) {
        yearRow = i;
        break;
      }
    }
    const quarterRow = yearRow >= 0 ? yearRow + 2 : -1;
    const dataStart = quarterRow >= 0 ? quarterRow + 1 : 14;

    // Columna de datos más a la derecha con algún número (trimestre más reciente).
    let cmax = -1;
    for (let i = dataStart; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      for (let c = 2; c <= 14; c++) if (typeof r[c] === "number") cmax = Math.max(cmax, c);
    }
    if (cmax < 0) throw new Error("MITMA: sin columnas de datos");

    const periodo = derivePeriodo(rows, yearRow, quarterRow, cmax);

    const data: ProvincePrice[] = [];
    const seen = new Set<string>();
    for (let i = dataStart; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r[1] == null) continue;
      const raw = String(r[1]).trim();
      const key = norm(raw);
      if (!key || SKIP.has(key)) continue;

      let val: number | null = null;
      for (let c = cmax; c >= 2; c--) {
        if (typeof r[c] === "number") {
          val = r[c] as number;
          break;
        }
      }
      if (val == null) continue;

      const provincia = RENAME[key] ?? stripParenthetical(raw);
      const pk = norm(provincia);
      if (seen.has(pk)) continue;
      seen.add(pk);

      const entry: ProvincePrice = { provincia, precioM2: Math.round(val) };
      if (typeof r[16] === "number") entry.variacionInteranual = round1(r[16] as number);
      data.push(entry);
    }
    if (data.length < 20) throw new Error(`MITMA: solo ${data.length} provincias parseadas`);

    return { periodo, fuente: FUENTE, data };
  } catch (err) {
    console.warn(
      "[market/mitma] precio por provincia falló, usando fallback:",
      err instanceof Error ? err.message : err
    );
    return FALLBACK_PRICE_BY_PROVINCE;
  }
}

function derivePeriodo(
  rows: unknown[][],
  yearRow: number,
  quarterRow: number,
  cmax: number
): string {
  let year = "";
  if (yearRow >= 0) {
    for (let c = cmax; c >= 2; c--) {
      const v = rows[yearRow]?.[c];
      const m = typeof v === "string" ? v.match(/(\d{4})/) : null;
      if (m) {
        year = m[1];
        break;
      }
    }
  }
  let q = "";
  if (quarterRow >= 0) {
    const v = rows[quarterRow]?.[cmax];
    const m = typeof v === "string" ? v.match(/(\d)/) : null;
    if (m) q = m[1];
  }
  if (year && q) return `${year}T${q}`;
  return year || "actual";
}

function stripParenthetical(s: string): string {
  return s.replace(/\(.*?\)/g, "").replace(/\/.*/, "").trim();
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
