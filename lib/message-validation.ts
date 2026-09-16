import { isRecord, validDisplayProperty } from "@/lib/api-validation";
import { isCurrentModel, STALE_MODEL_NOTICE } from "@/lib/valoracion/current-model";
import type { Message } from "@/types";

type Check = (value: unknown) => boolean;
const text: Check = (v) => typeof v === "string" && v.length <= 100_000;
const number: Check = (v) => typeof v === "number" && Number.isFinite(v);
const boolean: Check = (v) => typeof v === "boolean";
const optional = (check: Check): Check => (v) => v == null || check(v);
const oneOf = (...values: unknown[]): Check => (v) => values.includes(v);
const array = (check: Check, max = 100): Check => (v) => Array.isArray(v) && v.length <= max && v.every(check);
const shape = (fields: Record<string, Check>): Check => (v) => isRecord(v) && Object.entries(fields).every(([key, check]) => check(v[key]));
const numbers = (...keys: string[]) => Object.fromEntries(keys.map((key) => [key, number]));
const texts = (...keys: string[]) => Object.fromEntries(keys.map((key) => [key, text]));
const mode = oneOf("a_pie", "bici", "coche", "transporte");
const period = shape({ periodo: text, variacionInteranual: number });
const historicalResult: Check = (v) => isRecord(v)
  && typeof v.model_id === "string" && v.model_id.length > 0 && v.model_id.length <= 100
  && typeof v.model_version === "string" && v.model_version.length > 0 && v.model_version.length <= 100
  && !isCurrentModel(v);

/** Comprueba las estructuras utilizadas por las tarjetas antes de persistirlas o renderizarlas. */
const cards: Record<string, Check> = {
  mortgage: shape(numbers("propertyPrice", "downPayment", "downPaymentPercent", "loanAmount", "termYears", "interestRate", "monthlyPayment", "totalCost", "totalInterest", "effortPercent")),
  market: shape({
    provincia: shape({ consultada: text, encontrada: optional(text) }),
    comparacion: shape({ precioM2Propiedad: number, precioM2Provincia: optional(number), diferenciaPorcentual: optional(number), valoracion: optional(text) }),
    tendencia: shape({ ultimoTrimestre: optional(period), resumen: optional(text), serie: array(period, 500) }),
    hipoteca: shape({ tipoMedio: optional(number), euribor12m: optional(number), periodo: optional(text) }),
    fuentes: shape(texts("precioProvincia", "ipv", "bde")),
    actualizado: shape({ precioProvincia: optional(text), ipv: optional(text), bde: optional(text), contieneRespaldo: boolean }),
    notaTipo: optional(text),
  }),
  rent: shape({
    zona: shape({ consultada: text, referencia: optional(text) }), precioMes: number, eurM2Mes: number,
    referenciaEurM2Mes: optional(number), rangoZona: optional(shape(numbers("min", "max"))),
    diferenciaPorcentual: optional(number), valoracion: optional(text), banda: optional(oneOf("barato", "ajustado", "en_linea", "caro", "muy_caro")),
    nivel: optional(oneOf("barrio", "provincia")), fuente: text, actualizado: optional(text), fromFallback: boolean,
  }),
  commute: shape({
    origen: optional(shape({ direccion: text, lat: number, lon: number })),
    destino: shape({ etiqueta: text, lat: number, lon: number }), distanciaLineaKm: optional(number),
    modos: array(shape({ modo: mode, minutos: optional(number), distanciaKm: optional(number), disponible: boolean }), 4),
    recomendado: optional(mode), proveedor: oneOf("openrouteservice", "estimacion"), nota: optional(text),
    rutaGeo: optional(shape({ aprox: boolean, geometria: array((p) => Array.isArray(p) && p.length === 2 && p.every(number), 20_000) })),
  }),
  neighborhood: shape({
    zona: shape({ consultada: text, encontrada: optional(text), nivel: optional(oneOf("barrio", "provincia")) }),
    seguridad: shape({ indice: optional(number), etiqueta: optional(text), tasaCriminalidad: optional(number) }),
    calidadVida: shape({ indiceGlobal: optional(number), indicadores: array(shape({ clave: text, etiqueta: text, valor: number })) }),
    resumen: optional(text), fuentes: shape(texts("seguridad", "calidadVida")), actualizado: optional(text), fromFallback: boolean, aproximado: boolean,
  }),
  purchaseValuation: shape({
    propertyCode: text, estado: oneOf("ok", "fuera_ambito", "datos_insuficientes", "no_disponible"), aviso: optional(text),
    operation: optional(oneOf("sale", "rent")), sourceKind: optional(oneOf("idealista", "demo")),
    resultado: optional((v) => historicalResult(v) || (shape({
      model_id: text, model_version: text, nivel_precios: text, advertencias: array(text),
      brecha_pct: optional(number), intervalo: optional((x) => Array.isArray(x) && x.length === 2 && x.every(number)),
      explicacion: optional(shape({ factores: array(shape({ variable: text, sentido: oneOf("aumenta", "disminuye") })) })),
    })(v) && isRecord(v) && (v.model_id === "habitIA-xgboost-2018-v3"
      ? shape({ precio_estimado: number, renta_mensual_estimada: number, ano_renta: number, ultimo_ano_venta: number, ultimo_ano_alquiler: number, operation: optional(oneOf("sale", "rent")) })(v)
      : number(v.precio_justo)))),
  }),
};

const toolCall = shape({ id: text, name: text, input: isRecord, status: oneOf("running", "done", "error"), isError: optional(boolean) });
export function validMessageCards(value: Record<string, unknown>): boolean {
  return (value.properties === undefined || array(validDisplayProperty, 100)(value.properties))
    && (value.toolCalls === undefined || array(toolCall, 100)(value.toolCalls))
    && Object.entries(cards).every(([key, check]) => value[key] === undefined || check(value[key]));
}

/** Una fila antigua dañada no debe inutilizar todo el historial compartido. */
export function readStoredMessage(value: unknown): Message | null {
  if (!isRecord(value) || !oneOf("user", "assistant")(value.role) || !text(value.content)
    || typeof value.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id)
    || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return null;
  const result: Record<string, unknown> = { id: value.id, role: value.role, content: value.content, createdAt: value.createdAt };
  if (Array.isArray(value.properties)) result.properties = value.properties.filter(validDisplayProperty).slice(0, 100);
  if (Array.isArray(value.toolCalls)) result.toolCalls = value.toolCalls.filter(toolCall).slice(0, 100);
  for (const [key, check] of Object.entries(cards)) if (check(value[key])) result[key] = value[key];
  const purchase = result.purchaseValuation;
  if (isRecord(purchase) && historicalResult(purchase.resultado)) {
    // No se exigen campos introducidos por versiones posteriores a una tarjeta
    // histórica. Se conserva su aviso junto al texto, pero nunca sus cifras.
    result.purchaseValuation = { propertyCode: purchase.propertyCode, operation: purchase.operation,
      sourceKind: purchase.sourceKind, estado: "no_disponible", resultado: null, aviso: STALE_MODEL_NOTICE };
  }
  return result as unknown as Message;
}
