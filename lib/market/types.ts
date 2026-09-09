/**
 * Tipos compartidos para los datos de mercado cacheados en Supabase.
 * Cada `MarketDataKey` corresponde a una fila de la tabla `market_data`.
 */

export type MarketDataKey =
  | "ine_price_by_province"
  | "bde_mortgage_rates"
  | "ine_ipv_quarterly"
  | "rent_reference";

export interface ProvincePrice {
  /** Nombre canónico de la provincia, p. ej. "Madrid". */
  provincia: string;
  /** €/m² medio de vivienda libre. */
  precioM2: number;
  /** Variación interanual en porcentaje. */
  variacionInteranual?: number;
}

export interface InePriceByProvince {
  /** Periodo de referencia, p. ej. "2024T4". */
  periodo: string;
  fuente: string;
  data: ProvincePrice[];
}

export interface BdeMortgageRates {
  /** Periodo de referencia, p. ej. "2024-12". */
  periodo: string;
  fuente: string;
  /** TEDR medio ponderado de nuevas operaciones de crédito a hogares para vivienda. */
  tipoMedio: number;
  /** Euribor 12 meses (referencia común para variables). */
  euribor12m?: number;
  /** El Euríbor puede publicarse para un mes distinto del TEDR. */
  euriborPeriodo?: string;
}

export interface IpvQuarterPoint {
  /** Periodo trimestral, p. ej. "2024T4". */
  periodo: string;
  /** Variación interanual del IPV en porcentaje. */
  variacionInteranual: number;
}

export interface IneIpvQuarterly {
  fuente: string;
  /** Últimos 4-8 trimestres en orden cronológico (más antiguo primero). */
  serie: IpvQuarterPoint[];
}

/** Referencia de alquiler €/m²/mes por barrio/distrito. */
export interface RentZonePrice {
  /** Nombre del barrio o distrito, p. ej. "Malasaña". */
  zona: string;
  /** Municipio al que pertenece, p. ej. "Madrid". */
  municipio?: string;
  provincia?: string;
  /** €/m²/mes de referencia. */
  eurM2Mes: number;
  /** Rango típico €/m²/mes. */
  min?: number;
  max?: number;
}

/** Referencia de alquiler €/m²/mes a nivel provincial (respaldo). */
export interface RentProvincePrice {
  provincia: string;
  eurM2Mes: number;
  min?: number;
  max?: number;
}

export interface RentReference {
  /** Periodo de referencia, p. ej. "2025T1". */
  periodo: string;
  fuente: string;
  /** Referencia por barrio/distrito (más específica). */
  zonas: RentZonePrice[];
  /** Referencia por provincia (respaldo cuando no hay barrio). */
  provincias: RentProvincePrice[];
}

export type MarketDataPayload = {
  ine_price_by_province: InePriceByProvince;
  bde_mortgage_rates: BdeMortgageRates;
  ine_ipv_quarterly: IneIpvQuarterly;
  rent_reference: RentReference;
};
