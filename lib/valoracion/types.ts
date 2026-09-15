/** Contrato del servicio de valoración (FastAPI · `memoria/servicio/api.py`). */

export type BandaValoracion = "barato" | "ajustado" | "en_linea" | "caro" | "muy_caro";

export interface ValoracionModeloV2 {
  propertyCode: string;
  estado: "ok";
  model_version: string;
  model_id: "habitIA-oferta-2018-v2";
  clasificacion_validada: false;
  explicacion?: {
    metodo: string; escala: string;
    factores: Array<{ variable: string; valor: string | number | null; contribucion_log_euros: number; sentido: "aumenta" | "disminuye" }>;
    advertencia: string; no_causal: true;
  };
  objetivo: "precio_anunciado";
  periodo_entrenamiento: "2018";
  extrapolacion_temporal: true;
  precision_actual_validada: false;
  factor_escenario: number;
  advertencias: string[];
  /** Alias técnico heredado para precio anunciado estimado, no precio justo. */
  precio_justo: number;
  /** Intervalo histórico calibrado; la cobertura observada no garantiza cada caso. */
  intervalo: [number, number];
  precio_anunciado: number | null;
  /** Desviación porcentual del anuncio respecto a la estimación indexada. */
  brecha_pct: number | null;
  banda: BandaValoracion | null;
  /** El precio cae por debajo del borde inferior del intervalo. */
  oportunidad: boolean;
  sobrevalorado: boolean;
  seccion_censal: string;
  barrio: string;
  distrito: string;
  /** Trimestre al que está renivelado el resultado, p. ej. "2026T1". */
  nivel_precios: string;
}

/** Paquete XGBoost: estimación puntual anual, sin intervalos ni bandas calibradas. */
export interface ValoracionModeloV3 extends Omit<ValoracionModeloV2,
  "model_id" | "precio_justo" | "intervalo" | "banda" | "oportunidad" | "sobrevalorado" | "explicacion" | "seccion_censal" | "barrio" | "distrito"> {
  model_id: "habitIA-xgboost-2018-v3";
  modelo: "arboles_desplegable_ajustado";
  modelo_sha256: string;
  /** Desde 3.1: operación y unidades de la comparación; 3.0 solo admitía venta. */
  operation?: "sale" | "rent";
  precio_comparacion?: number;
  unidad_comparacion?: "EUR" | "EUR/mes";
  /** Valor de venta del inmueble en euros, también para anuncios de alquiler. */
  precio_estimado: number;
  precio_estimado_base: number;
  intervalo: null;
  banda: null;
  oportunidad: false;
  sobrevalorado: false;
  explicacion?: never;
  ano_base: 2018;
  ano_precio: number;
  ano_renta: number;
  barrio_code: string;
  distrito_code: string;
  renta_mensual_estimada: number;
  factor_renta_mensual: number;
  alquiler_validado: false;
  metodo_renta: `ratio_distrital_${number}`;
  calidad: {
    sin_descripcion: boolean;
    planta_imputada: boolean;
    ascensor_desde_descripcion: boolean;
    barrio_rescatado: boolean;
    fuera_de_rango: string | null;
  };
}

export type ValoracionModelo = ValoracionModeloV2 | ValoracionModeloV3;

export function operacionValoracion(v: ValoracionModelo): "sale" | "rent" {
  return v.model_id === "habitIA-xgboost-2018-v3" && v.operation === "rent" ? "rent" : "sale";
}

/** Importe comparable con el anuncio: mensual en alquiler, total en venta. */
export function precioEstimado(v: ValoracionModelo): number {
  return v.model_id === "habitIA-xgboost-2018-v3"
    ? v.operation === "rent" ? v.renta_mensual_estimada : v.precio_estimado
    : v.precio_justo;
}

export interface RespuestaValoracion {
  model_id?: ValoracionModelo["model_id"];
  resultados: ValoracionModelo[];
  errores?: Array<{ indice: number; propertyCode?: string; estado: string; detalle: string }>;
  ms: number;
  nivel_precios: string;
  model_version: string;
  objetivo: "precio_anunciado";
  extrapolacion_temporal: true;
  precision_actual_validada: false;
}

/** Lo que el servicio necesita de cada anuncio: es un subconjunto de /search. */
export interface AnuncioParaValorar {
  propertyCode?: string;
  price?: number;
  size: number;
  rooms?: number;
  bathrooms?: number;
  floor?: string;
  hasLift?: boolean;
  exterior?: boolean;
  latitude: number;
  longitude: number;
  propertyType?: string;
  municipality?: string;
  operation: "sale" | "rent";
  description?: string;
  parkingSpace?: { hasParkingSpace?: boolean };
  detailedType?: { typology?: string; subTypology?: string };
}
