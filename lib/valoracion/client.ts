import "server-only";
import type { Property } from "@/types";
import { isRecord } from "@/lib/api-validation";
import type { AnuncioParaValorar, RespuestaValoracion, ValoracionModelo, ValoracionModeloV3 } from "./types";
import { operacionValoracion } from "./types";
import { CURRENT_MODEL_ID, CURRENT_MODEL_VERSION, CURRENT_PACKAGE_SHA256, CURRENT_SALE_YEAR, CURRENT_RENT_YEAR,
  LAST_OBSERVED_SALE_YEAR, LAST_OBSERVED_RENT_YEAR, isCurrentModel } from "./current-model";
const URL_BASE = process.env.VALORACION_URL;
const TOKEN = process.env.VALORACION_TOKEN;
const TIMEOUT_MS = Math.min(20_000, Math.max(1000, Number(process.env.VALORACION_TIMEOUT_MS) || 10_000));
export const MAX_VALORACION_BATCH = 24;
const finitePositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const ABSTENTION_REASONS: Record<string, string> = {
  a_reformar: "la descripción indica que está a reformar o para actualizar",
  ocupada: "la descripción indica que está ocupada, alquilada o sin plena posesión",
  fuera_de_madrid: "está fuera del ámbito de Madrid capital",
  tipologia_casa: "su tipología de casa o chalet no está admitida",
  superficie_fuera_de_dominio: "supera la superficie máxima de 367 m²",
  operacion_no_admitida: "la operación no está admitida",
  sin_coordenadas: "faltan coordenadas válidas",
  sin_superficie: "falta una superficie válida",
  sin_habitaciones: "falta el número de habitaciones observado",
  sin_banos: "falta el número de baños observado",
};
/** Traduce únicamente códigos conocidos; conserva los mensajes y errores nuevos. */
function abstentionMessage(detail: unknown): string {
  if (typeof detail !== "string") return "Datos insuficientes para valorar.";
  const reasons = detail.split(";").map(reason => reason.trim());
  return reasons.every(reason => Object.hasOwn(ABSTENTION_REASONS, reason))
    ? `El modelo no estima esta vivienda porque ${reasons.map(reason => ABSTENTION_REASONS[reason]).join("; además, ")}.`
    : detail;
}
function validResultV3(value: unknown, codes: Set<string>): value is ValoracionModeloV3 {
  if (!isRecord(value) || typeof value.propertyCode !== "string" || !codes.has(value.propertyCode)
    || value.estado !== "ok" || !isCurrentModel(value)
    || value.modelo !== "arboles_desplegable_ajustado" || typeof value.modelo_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.modelo_sha256)
    || value.objetivo !== "precio_anunciado" || value.periodo_entrenamiento !== "2018"
    || value.extrapolacion_temporal !== true || value.precision_actual_validada !== false || value.clasificacion_validada !== false
    || value.ano_precio !== CURRENT_SALE_YEAR || value.ano_renta !== CURRENT_RENT_YEAR || value.nivel_precios !== String(CURRENT_SALE_YEAR) || value.ano_base !== 2018
    || value.ajuste_proyectado !== true || value.ultimo_ano_venta !== LAST_OBSERVED_SALE_YEAR
    || value.ultimo_ano_alquiler !== LAST_OBSERVED_RENT_YEAR || value.ano_inicio_tendencia !== 2018
    || !finitePositive(value.precio_estimado) || !finitePositive(value.precio_estimado_base) || !finitePositive(value.factor_escenario)
    || value.intervalo !== null || value.banda !== null || value.oportunidad !== false || value.sobrevalorado !== false
    || value.explicacion != null || value.alquiler_validado !== false || value.metodo_renta !== `ratio_distrital_proyectado_${value.ano_renta}`
    || !finitePositive(value.renta_mensual_estimada) || !finitePositive(value.factor_renta_mensual)
    || typeof value.barrio_code !== "string" || !/^\d{3}$/.test(value.barrio_code)
    || typeof value.distrito_code !== "string" || value.barrio_code.slice(0, 2) !== value.distrito_code
    || (value.precio_anunciado !== null && !finitePositive(value.precio_anunciado))
    || (value.brecha_pct !== null && (typeof value.brecha_pct !== "number" || !Number.isFinite(value.brecha_pct)))
    || !Array.isArray(value.advertencias) || !value.advertencias.every((v: unknown) => typeof v === "string")
    || !isRecord(value.calidad) || !["sin_descripcion", "planta_imputada", "ascensor_desde_descripcion", "barrio_rescatado", "obra_nueva"].every((key) => isRecord(value.calidad) && typeof value.calidad[key] === "boolean")
    || (value.calidad.fuera_de_rango !== null && typeof value.calidad.fuera_de_rango !== "string")) return false;
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 1e-6);
  const reference = value.operation === "rent" ? value.renta_mensual_estimada : value.precio_estimado;
  if (!["sale", "rent"].includes(String(value.operation)) || !finitePositive(value.precio_comparacion)
    || value.unidad_comparacion !== (value.operation === "rent" ? "EUR/mes" : "EUR")
    || !close(value.precio_comparacion, reference)) return false;
  return close(value.precio_estimado, value.precio_estimado_base * value.factor_escenario)
    && close(value.renta_mensual_estimada, value.precio_estimado * value.factor_renta_mensual)
    && (value.precio_anunciado === null ? value.brecha_pct === null
      : typeof value.brecha_pct === "number" && close(value.brecha_pct, (value.precio_anunciado / reference - 1) * 100));
}

function validResult(value: unknown, codes: Set<string>): value is ValoracionModelo {
  return validResultV3(value, codes);
}
export function valoracionDisponible(): boolean { return Boolean(URL_BASE); }
export function esValorable(p: Property): boolean {
  const type = p.propertyType?.toLowerCase();
  return ["sale", "rent"].includes(p.operation) && p.municipality?.trim().toLowerCase() === "madrid"
    && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && p.latitude! >= 40.30 && p.latitude! <= 40.55 && p.longitude! >= -3.90 && p.longitude! <= -3.50
    && p.size >= 20 && p.size <= 367
    && (["flat", "penthouse", "duplex", "studio"].includes(type) || (type === "homes" && p.detailedType?.typology === "flat"));
}
export function aAnuncio(p: Property): AnuncioParaValorar {
  return { propertyCode: p.propertyCode, price: p.price, size: p.size, rooms: p.rooms,
    bathrooms: p.bathrooms, floor: p.floor, hasLift: p.hasLift, exterior: p.exterior,
    latitude: p.latitude!, longitude: p.longitude!, propertyType: p.propertyType,
    detailedType: p.detailedType, municipality: p.municipality, operation: p.operation,
    description: p.description, parkingSpace: p.parkingSpace, newDevelopment: p.newDevelopment };
}
export interface EstadoValoracion { estado: "ok" | "fuera_ambito" | "datos_insuficientes" | "no_disponible"; motivo: string }
export interface LoteValoracion { resultados: Map<string, ValoracionModelo>; estados: Map<string, EstadoValoracion> }
export async function valorarLoteConEstado(properties: Property[], opts: { explicar?: boolean } = {}): Promise<LoteValoracion> {
  const resultados = new Map<string, ValoracionModelo>();
  const estados = new Map<string, EstadoValoracion>();
  const candidates = properties.filter((p) => {
    if (esValorable(p)) return true;
    estados.set(p.propertyCode, { estado: "fuera_ambito", motivo: "Se requiere un piso de compra o alquiler en Madrid capital, superficie admitida y coordenadas. XGBoost admite hasta 367 m²." });
    return false;
  });
  const fail = (motivo: string) => {
    for (const p of candidates) if (!estados.has(p.propertyCode)) estados.set(p.propertyCode, { estado: "no_disponible", motivo });
    return { resultados, estados };
  };
  if (!candidates.length) return { resultados, estados };
  const candidateCodes = new Set(candidates.map((p) => p.propertyCode));
  const candidateOperations = new Map(candidates.map((p) => [p.propertyCode, p.operation]));
  const candidatePrices = new Map(candidates.map((p) => [p.propertyCode, p.price]));
  if (!URL_BASE) return fail("El servicio del modelo no está configurado.");
  if (candidates.length > MAX_VALORACION_BATCH) return fail("El lote supera el máximo de 24 anuncios.");
  try {
    const res = await fetch(`${URL_BASE.replace(/\/$/, "")}/valorar`, {
      method: "POST", headers: { "content-type": "application/json", ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) },
      // Comparación actual = escenario indexado explícito, no validación actual.
      body: JSON.stringify({ anuncios: candidates.map(aAnuncio), renivelar: true, ano_ajuste: CURRENT_SALE_YEAR, explicar: opts.explicar === true }),
      signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store",
    });
    const raw = await res.json().catch(() => null);
    const errors = raw?.errores ?? raw?.detail?.errores;
    if (Array.isArray(errors)) for (const e of errors) {
      const code = e.propertyCode ?? candidates[e.indice]?.propertyCode;
      if (typeof code === "string" && candidateCodes.has(code)) estados.set(code, { estado: e.estado === "fuera_ambito" ? "fuera_ambito" : e.estado === "no_disponible" ? "no_disponible" : "datos_insuficientes", motivo: abstentionMessage(e.detalle) });
    }
    if (!res.ok || !Array.isArray(raw?.resultados)) return fail(res.status === 422 ? "El servicio rechazó las entradas; revisa los datos y el ámbito." : "El modelo no está disponible. No hay una valoración individual para este anuncio.");
    if (raw.model_version !== CURRENT_MODEL_VERSION || raw.model_id !== CURRENT_MODEL_ID || raw.objetivo !== "precio_anunciado"
      || raw.paquete_sha256 !== CURRENT_PACKAGE_SHA256
      || raw.extrapolacion_temporal !== true || raw.precision_actual_validada !== false) {
      return fail(`El servicio no devuelve el modelo vigente (XGBoost ${CURRENT_MODEL_VERSION}). No se utiliza una estimación anterior.`);
    }
    const data = raw as RespuestaValoracion;
    for (const v of data.resultados) {
      if (!validResult(v, candidateCodes) || estados.has(v.propertyCode) || v.model_version !== data.model_version || v.nivel_precios !== data.nivel_precios
        || operacionValoracion(v) !== candidateOperations.get(v.propertyCode)
        || v.precio_anunciado !== candidatePrices.get(v.propertyCode)
        || (data.model_id != null && v.model_id !== data.model_id)
        || data.resultados.filter((row) => row?.propertyCode === v.propertyCode).length !== 1) continue;
      resultados.set(v.propertyCode, v);
      estados.set(v.propertyCode, { estado: "ok", motivo: v.model_id === "habitIA-xgboost-2018-v3"
        ? v.operation === "rent"
          ? `Renta mensual derivada de la venta y ratios distritales proyectados a ${v.ano_renta}. Últimas fuentes: venta de ${v.ultimo_ano_venta} y alquiler de ${v.ultimo_ano_alquiler}. Alquiler no validado; sin intervalo calibrado.`
          : `Estimación de oferta proyectada a ${v.ano_precio}, con última fuente de venta de ${v.ultimo_ano_venta}. Sin intervalo calibrado; precisión actual no validada.`
        : "Estimación de oferta histórica indexada. No demuestra precisión en precios actuales." });
    }
    return fail("El servicio no devolvió una valoración válida de un modelo compatible para este anuncio.");
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
