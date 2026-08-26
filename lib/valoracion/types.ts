/** Contrato del servicio de valoración (FastAPI · `memoria/servicio/api.py`). */

export type BandaValoracion = "barato" | "ajustado" | "en_linea" | "caro" | "muy_caro";

export interface ValoracionModelo {
  propertyCode: string | null;
  /** Precio que el modelo considera razonable, en euros del periodo indicado. */
  precio_justo: number;
  /** Intervalo con cobertura del 90 % (conformalizado). */
  intervalo: [number, number];
  precio_anunciado: number | null;
  /** + = más caro que el precio justo; − = más barato. */
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
  ms: number;
  nivel_precios: string;
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
  detailedType?: { typology?: string; subTypology?: string };
}
