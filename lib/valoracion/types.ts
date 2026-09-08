/** Contrato del servicio de valoración (FastAPI · `memoria/servicio/api.py`). */

export type BandaValoracion = "barato" | "ajustado" | "en_linea" | "caro" | "muy_caro";

export interface ValoracionModelo {
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

export interface RespuestaValoracion {
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
  detailedType?: { typology?: string; subTypology?: string };
}
