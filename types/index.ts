export type Role = "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
  status: "running" | "done" | "error";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  properties?: Property[];
  mortgage?: MortgageCalc;
  market?: MarketAnalysis;
  rent?: RentValuation;
  commute?: CommuteResult;
  neighborhood?: NeighborhoodReport;
  createdAt: string;
}

/** Modos de desplazamiento soportados por el cálculo de trayecto. */
export type CommuteMode = "a_pie" | "bici" | "coche" | "transporte";

/** Prioridades vitales que el usuario marca en el onboarding. */
export type Priority =
  | "seguridad"
  | "cerca_trabajo"
  | "vida_nocturna"
  | "zonas_verdes"
  | "transporte"
  | "tranquilidad";

/** Con quién vivirá el usuario (contexto para afinar habitaciones y barrio). */
export type Hogar = "solo" | "pareja" | "familia" | "compartido";

/** Imprescindibles que el usuario marca (afinan el ranking cuando hay dato). */
export type Imprescindible =
  | "ascensor"
  | "exterior"
  | "terraza"
  | "aire_acondicionado"
  | "amueblado"
  | "garaje"
  | "trastero";

/**
 * Perfil del inquilino capturado en el onboarding. Se guarda en localStorage
 * (no hay auth) y se envía al backend para personalizar el system prompt.
 */
export interface UserProfile {
  name?: string;
  operacion: "alquiler" | "venta";
  /** Tipo de inmueble buscado. */
  tipo?: "pisos" | "casas";
  /** Zona o ciudad donde quiere vivir (texto resuelto desde el mapa). */
  zona?: string;
  /** Coordenadas de la zona elegida en el mapa, para centrar y referenciar. */
  zonaLat?: number;
  zonaLon?: number;
  /** €/mes en alquiler, € totales en compra. */
  presupuestoMax?: number;
  habitaciones?: number;
  /** Con quién vivirá. */
  hogar?: Hogar;
  /** Si tiene mascota (afecta a admite-mascotas). */
  mascota?: boolean;
  /** Imprescindibles marcados. */
  imprescindibles?: Imprescindible[];
  /** Lugar de trabajo (coordenadas elegidas en el mapa), para el trayecto. */
  trabajo?: {
    direccion: string;
    lat?: number;
    lon?: number;
    modo?: CommuteMode;
  };
  prioridades?: Priority[];
  createdAt: string;
}

export interface Property {
  propertyCode: string;
  title: string;
  price: number;
  pricePerSqm?: number;
  size: number;
  rooms: number;
  bathrooms?: number;
  address: string;
  district?: string;
  municipality?: string;
  province?: string;
  propertyType: string;
  operation: "sale" | "rent";
  thumbnail: string;
  url: string;
  description?: string;
  photos?: string[];
  features?: string[];
  hasLift?: boolean;
  exterior?: boolean;
  floor?: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyDetail extends Property {
  description: string;
  photos: string[];
  features: string[];
  energyCertification?: string;
  yearBuilt?: number;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  preview?: string;
}

export interface MortgageCalc {
  propertyPrice: number;
  downPayment: number;
  downPaymentPercent: number;
  loanAmount: number;
  termYears: number;
  interestRate: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  /** % del salario medio español (≈2.200 €/mes) que supone la cuota */
  effortPercent: number;
}

export interface SearchFilters {
  zona: string;
  operacion: "venta" | "alquiler";
  tipo?: "pisos" | "casas" | "locales" | "garajes";
  precioMin?: number;
  precioMax?: number;
  metrosMin?: number;
  metrosMax?: number;
  habitaciones?: number;
}

export interface MarketAnalysis {
  provincia: { consultada: string; encontrada: string | null };
  comparacion: {
    precioM2Propiedad: number;
    precioM2Provincia: number | null;
    diferenciaPorcentual: number | null;
    valoracion: string | null;
  };
  tendencia: {
    ultimoTrimestre: { periodo: string; variacionInteranual: number } | null;
    resumen: string | null;
    serie: Array<{ periodo: string; variacionInteranual: number }>;
  };
  hipoteca: {
    tipoMedio: number | null;
    euribor12m: number | null;
    periodo: string | null;
  };
  fuentes: { precioProvincia: string; ipv: string; bde: string };
  actualizado: {
    precioProvincia: string | null;
    ipv: string | null;
    bde: string | null;
    contieneRespaldo: boolean;
  };
  notaTipo?: string;
}

/**
 * Valoración del precio de un alquiler frente a la referencia de la zona
 * (¿caro o barato?). La produce la tool `valorar_alquiler`.
 */
export interface RentValuation {
  zona: { consultada: string; referencia: string | null };
  /** Renta mensual del anuncio analizado. */
  precioMes: number;
  /** €/m²/mes del anuncio. */
  eurM2Mes: number;
  /** €/m²/mes de referencia para la zona (o provincia como respaldo). */
  referenciaEurM2Mes: number | null;
  /** Rango típico €/m²/mes de la zona, para dar contexto. */
  rangoZona: { min: number; max: number } | null;
  /** Diferencia % del anuncio frente a la referencia. */
  diferenciaPorcentual: number | null;
  /** Lectura cualitativa: "barato", "en línea con la zona", "caro"… */
  valoracion: string | null;
  banda: "barato" | "ajustado" | "en_linea" | "caro" | "muy_caro" | null;
  /** Nivel de la referencia encontrada. */
  nivel: "barrio" | "provincia" | null;
  fuente: string;
  actualizado: string | null;
  fromFallback: boolean;
}

/** Un modo de transporte resuelto para el trayecto trabajo↔piso. */
export interface CommuteLeg {
  modo: CommuteMode;
  minutos: number | null;
  distanciaKm: number | null;
  disponible: boolean;
}

/** Resultado del cálculo de trayecto entre el trabajo y la vivienda. */
export interface CommuteResult {
  origen: { direccion: string; lat: number; lon: number } | null;
  destino: { etiqueta: string; lat: number; lon: number };
  /** Distancia en línea recta, como referencia rápida. */
  distanciaLineaKm: number | null;
  modos: CommuteLeg[];
  /** Modo destacado (preferido del usuario o el más razonable). */
  recomendado: CommuteMode | null;
  /** "openrouteservice" si es routing real; "estimacion" si es heurística. */
  proveedor: "openrouteservice" | "estimacion";
  /**
   * Polilínea de la ruta del modo recomendado para dibujar el trayecto en el
   * mapa, en orden GeoJSON `[lon, lat]`. `aprox: true` = línea recta de respaldo
   * (sin geometría de routing real, p. ej. transporte público o sin ORS).
   */
  rutaGeo?: { geometria: Array<[number, number]>; aprox: boolean } | null;
  nota?: string;
}

/** Un indicador de calidad de vida (0-100). */
export interface QolIndicator {
  clave: "transporte" | "zonas_verdes" | "servicios" | "vida_nocturna" | "tranquilidad";
  etiqueta: string;
  valor: number;
}

/**
 * Informe de barrio: seguridad + calidad de vida. La produce `consultar_barrio`.
 * Los datos curados son aproximados (`aproximado: true`) y así se etiquetan.
 */
export interface NeighborhoodReport {
  zona: {
    consultada: string;
    encontrada: string | null;
    nivel: "barrio" | "provincia" | null;
  };
  seguridad: {
    /** 0-100, donde 100 es muy seguro. */
    indice: number | null;
    etiqueta: string | null;
    /** Infracciones penales por 1.000 habitantes/año, como contexto. */
    tasaCriminalidad: number | null;
  };
  calidadVida: {
    /** Compuesto 0-100. */
    indiceGlobal: number | null;
    indicadores: QolIndicator[];
  };
  resumen: string | null;
  fuentes: { seguridad: string; calidadVida: string };
  actualizado: string | null;
  fromFallback: boolean;
  /** `true` para datos curados/ilustrativos (no oficiales en vivo). */
  aproximado: boolean;
}

/**
 * Valoración de precio de una propiedad concreta frente a la referencia de la
 * zona. Resume tanto alquiler (€/m²/mes) como compra (€/m²). El panel la usa
 * para colorear los pisos y mostrar "cuánto se desvía del precio de mercado"
 * frente al precio que pide el anuncio (Idealista).
 */
export interface PropertyValuation {
  operacion: "alquiler" | "venta";
  /** €/m² del anuncio (mensual en alquiler, total en compra). */
  eurM2: number;
  /** €/m² de referencia para la zona/provincia, o null si no hay dato. */
  referenciaEurM2: number | null;
  /** + = más caro que la referencia; − = más barato. */
  diferenciaPorcentual: number | null;
  /** Lectura cualitativa ("en línea con la zona", "premium"…). */
  etiqueta: string | null;
  /** Banda normalizada para colorear el mapa. */
  banda: "barato" | "ajustado" | "en_linea" | "caro" | "muy_caro" | null;
  nivel: "barrio" | "provincia" | null;
  referencia: string | null;
  fromFallback: boolean;
}

/** Una propiedad con sus tres señales calculadas para el panel/mapa. */
export interface PropertyEnrichment {
  propertyCode: string;
  valuation: PropertyValuation | null;
  commute: CommuteResult | null;
  neighborhood: NeighborhoodReport | null;
}

/**
 * Una propiedad recomendada "para ti": la propiedad, sus señales, una
 * puntuación 0-100 de encaje con el perfil y la explicación de por qué encaja.
 */
export interface PropertyRecommendation {
  property: Property;
  enrichment: PropertyEnrichment;
  /** Encaje con el perfil, 0-100. */
  score: number;
  /** Frase legible: por qué este piso encaja contigo. */
  rationale: string;
  /** Etiquetas cortas para chips ("a 9′ del trabajo", "barrio seguro"…). */
  highlights: string[];
}

/** Eventos del stream SSE que envía /api/chat al cliente. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_end"; id: string; result: unknown; isError?: boolean }
  | { type: "properties"; items: Property[] }
  | { type: "mortgage"; data: MortgageCalc }
  | { type: "market"; data: MarketAnalysis }
  | { type: "rent"; data: RentValuation }
  | { type: "commute"; data: CommuteResult }
  | { type: "neighborhood"; data: NeighborhoodReport }
  | { type: "conversation"; id: string }
  | { type: "error"; message: string }
  | { type: "done" };
