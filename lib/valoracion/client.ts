import "server-only";
import type { Property } from "@/types";
import { isRecord } from "@/lib/api-validation";
import type { AnuncioParaValorar, RespuestaValoracion, ValoracionModelo } from "./types";
const URL_BASE = process.env.VALORACION_URL;
const TOKEN = process.env.VALORACION_TOKEN;
const TIMEOUT_MS = Math.min(20_000, Math.max(1000, Number(process.env.VALORACION_TIMEOUT_MS) || 10_000));
export const MAX_VALORACION_BATCH = 24;
const EXPECTED_MODEL_ID = "habitIA-oferta-2018-v2";
const isVersion2 = (value: unknown): value is string => typeof value === "string" && /^2\.\d+\.\d+$/.test(value);
const finitePositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
/** El servicio heredado puede responder 200: su contrato no acredita el modelo revisado. */
function validResult(value: unknown, codes: Set<string>): value is ValoracionModelo {
  if (!isRecord(value) || typeof value.propertyCode !== "string" || !codes.has(value.propertyCode)
    || value.estado !== "ok" || !isVersion2(value.model_version) || value.model_id !== EXPECTED_MODEL_ID
    || value.objetivo !== "precio_anunciado" || value.periodo_entrenamiento !== "2018"
    || value.extrapolacion_temporal !== true || value.precision_actual_validada !== false
    || value.clasificacion_validada !== false || !finitePositive(value.factor_escenario)
    || typeof value.nivel_precios !== "string" || !/^20\d{2}T[1-4]$/.test(value.nivel_precios)
    || !finitePositive(value.precio_justo) || !Array.isArray(value.intervalo) || value.intervalo.length !== 2
    || !value.intervalo.every(finitePositive) || value.intervalo[0] > value.precio_justo || value.precio_justo > value.intervalo[1]
    || (value.brecha_pct !== null && (typeof value.brecha_pct !== "number" || !Number.isFinite(value.brecha_pct)))
    || ![null, "barato", "ajustado", "en_linea", "caro", "muy_caro"].includes(value.banda as string | null)
    || typeof value.oportunidad !== "boolean" || typeof value.sobrevalorado !== "boolean"
    || !Array.isArray(value.advertencias) || !value.advertencias.every((warning: unknown) => typeof warning === "string")) return false;
  if (value.explicacion != null) {
    const explanation = value.explicacion;
    if (!isRecord(explanation) || explanation.no_causal !== true || explanation.escala !== "log_euros_2018"
      || typeof explanation.metodo !== "string" || typeof explanation.advertencia !== "string"
      || !Array.isArray(explanation.factores) || !explanation.factores.every((factor: unknown) => isRecord(factor)
        && typeof factor.variable === "string" && typeof factor.contribucion_log_euros === "number"
        && Number.isFinite(factor.contribucion_log_euros) && ["aumenta", "disminuye"].includes(String(factor.sentido)))) return false;
  }
  return true;
}
export function valoracionDisponible(): boolean { return Boolean(URL_BASE); }
export function esValorable(p: Property): boolean {
  const type = p.propertyType?.toLowerCase();
  return p.operation === "sale" && p.municipality?.trim().toLowerCase() === "madrid"
    && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && p.latitude! >= 40.30 && p.latitude! <= 40.55 && p.longitude! >= -3.90 && p.longitude! <= -3.50
    && p.size >= 20 && p.size <= 1000
    && (["flat", "penthouse", "duplex", "studio"].includes(type) || (type === "homes" && p.detailedType?.typology === "flat"));
}
export function aAnuncio(p: Property): AnuncioParaValorar {
  return { propertyCode: p.propertyCode, price: p.price, size: p.size, rooms: p.rooms,
    bathrooms: p.bathrooms, floor: p.floor, hasLift: p.hasLift, exterior: p.exterior,
    latitude: p.latitude!, longitude: p.longitude!, propertyType: p.propertyType,
    detailedType: p.detailedType, municipality: p.municipality };
}
export interface EstadoValoracion { estado: "ok" | "fuera_ambito" | "datos_insuficientes" | "no_disponible"; motivo: string }
export interface LoteValoracion { resultados: Map<string, ValoracionModelo>; estados: Map<string, EstadoValoracion> }
export async function valorarLoteConEstado(properties: Property[], opts: { explicar?: boolean } = {}): Promise<LoteValoracion> {
  const resultados = new Map<string, ValoracionModelo>();
  const estados = new Map<string, EstadoValoracion>();
  const candidates = properties.filter((p) => {
    if (esValorable(p)) return true;
    estados.set(p.propertyCode, { estado: "fuera_ambito", motivo: "El modelo requiere piso de compra en Madrid capital, superficie de 20–1.000 m², tipología admitida y coordenadas." });
    return false;
  });
  const fail = (motivo: string) => {
    for (const p of candidates) if (!estados.has(p.propertyCode)) estados.set(p.propertyCode, { estado: "no_disponible", motivo });
    return { resultados, estados };
  };
  if (!candidates.length) return { resultados, estados };
  const candidateCodes = new Set(candidates.map((p) => p.propertyCode));
  if (!URL_BASE) return fail("El servicio del modelo no está configurado.");
  if (candidates.length > MAX_VALORACION_BATCH) return fail("El lote supera el máximo de 24 anuncios.");
  try {
    const res = await fetch(`${URL_BASE.replace(/\/$/, "")}/valorar`, {
      method: "POST", headers: { "content-type": "application/json", ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) },
      // Comparación actual = escenario indexado explícito, no validación actual.
      body: JSON.stringify({ anuncios: candidates.map(aAnuncio), renivelar: true, explicar: opts.explicar === true }),
      signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store",
    });
    const raw = await res.json().catch(() => null);
    const errors = raw?.errores ?? raw?.detail?.errores;
    if (Array.isArray(errors)) for (const e of errors) {
      const code = e.propertyCode ?? candidates[e.indice]?.propertyCode;
      if (typeof code === "string" && candidateCodes.has(code)) estados.set(code, { estado: e.estado === "fuera_ambito" ? "fuera_ambito" : "datos_insuficientes", motivo: String(e.detalle ?? "Datos insuficientes para valorar.") });
    }
    if (!res.ok || !Array.isArray(raw?.resultados)) return fail(res.status === 422 ? "El servicio rechazó las entradas; revisa los datos y el ámbito." : "El modelo no está disponible. No hay una valoración individual para este anuncio.");
    if (!isVersion2(raw.model_version) || raw.objetivo !== "precio_anunciado"
      || raw.extrapolacion_temporal !== true || raw.precision_actual_validada !== false) {
      return fail("El servicio no cumple el contrato del modelo revisado v2. No se utiliza su estimación.");
    }
    const data = raw as RespuestaValoracion;
    for (const v of data.resultados) {
      if (!validResult(v, candidateCodes) || v.model_version !== data.model_version || v.nivel_precios !== data.nivel_precios
        || data.resultados.filter((row) => row?.propertyCode === v.propertyCode).length !== 1) continue;
      resultados.set(v.propertyCode, v);
      estados.set(v.propertyCode, { estado: "ok", motivo: "Estimación de oferta histórica indexada. No demuestra precisión en precios actuales." });
    }
    return fail("El servicio no devolvió una valoración válida del modelo revisado v2 para este anuncio.");
  } catch {
    return fail("No se ha recibido una respuesta válida del modelo a tiempo. No hay una valoración individual para este anuncio.");
  }
}
export async function valorarLote(properties: Property[]): Promise<Map<string, ValoracionModelo>> {
  return (await valorarLoteConEstado(properties)).resultados;
}
export async function saludValoracion(): Promise<Record<string, unknown> | null> {
  if (!URL_BASE) return null;
  try {
    const res = await fetch(`${URL_BASE.replace(/\/$/, "")}/salud`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? await res.json() as Record<string, unknown> : null;
  } catch { return null; }
}
