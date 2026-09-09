import type { ValoracionModelo } from "@/lib/valoracion/types";
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
  purchaseValuation?: PurchaseValuation;
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

/** Pesos personales enteros; cada uno 0–100, suma exacta de 100. */
export interface ScoreWeights { alpha: number; beta: number; gamma: number; delta: number }
export type ScoreComponentKey = "fair" | "opportunity" | "zone" | "lifestyle";
export interface ScoreComponent {
  key: ScoreComponentKey;
  label: string;
  weight: number;
  /** Ausencia de evidencia se conserva como null, nunca como dato neutro. */
  value: number | null;
  contribution: number;
  explanation: string;
}
export interface PersonalScoring {
  weights: ScoreWeights;
  components: ScoreComponent[];
  /** Porcentaje de los pesos que se ha podido evaluar. */
  coveragePercent: number;
  explanation: string;
}

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
  scoreWeights?: ScoreWeights;
  createdAt: string;
}

export interface Property {
  propertyCode: string;
  title: string;
  price: number;
  pricePerSqm?: number;
  size: number;
  rooms?: number;
  bathrooms?: number;
  address: string;
  district?: string;
  municipality?: string;
  province?: string;
  propertyType: string;
  detailedType?: { typology?: string; subTypology?: string };
  sourceKind?: "idealista" | "demo";
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

export interface PurchaseValuation {
  propertyCode: string;
  resultado: ValoracionModelo | null;
  estado: "ok" | "fuera_ambito" | "datos_insuficientes" | "no_disponible";
  aviso: string;
  sourceKind?: "idealista" | "demo";
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
  /** Centro geográfico (lat/lon). Si se da, evita geocodificar `zona`. */
  centro?: { lat: number; lon: number };
  /** Radio de búsqueda en metros alrededor del centro (default ~3,5 km). */
  radioMetros?: number;
  /** Código de localización Idealista (alternativa a centro+distancia). */
  locationId?: string;
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
 * Estimación individual del modelo o contexto territorial con procedencia.
 * Solo las estimaciones válidas del modelo pueden aportar bandas al panel.
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
  nivel: "barrio" | "provincia" | "modelo" | null;
  referencia: string | null;
  fromFallback: boolean;
  fuente?: string;
  periodo?: string;
  /** Solo con `nivel: "modelo"`: intervalo histórico; cobertura actual no validada. */
  intervalo?: [number, number];
  /** El precio cae por debajo del borde inferior del intervalo. */
  oportunidad?: boolean;
  /** Trimestre al que está renivelada la estimación, p. ej. "2026T1". */
  nivelPrecios?: string;
  modeloVersion?: string;
  avisoModelo?: string;
  estadoModelo?: "ok" | "fuera_ambito" | "datos_insuficientes" | "no_disponible";
  /** Contexto territorial verificado; no clasifica ni valora esta vivienda. */
  comparativa?: {
    referenciaEurM2: number | null;
    fuente: string;
    periodo: string;
    territorio: string;
  };
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
  scoring?: PersonalScoring;
  /** Frase legible: por qué este piso encaja contigo. */
  rationale: string;
  /** Etiquetas cortas para chips ("a 9′ del trabajo", "barrio seguro"…). */
  highlights: string[];
}

/* ────────────────────────────────────────────────────────────────────────
 * Calculadora "Comprar o alquilar" (gancho gratuito).
 *
 * Modelo financiero determinista, simulado AÑO A AÑO sobre un horizonte N,
 * presupuestariamente neutral: ambos escenarios parten del MISMO capital y
 * quien gasta menos en vivienda invierte la diferencia en una cartera que
 * crece al mismo tipo. El patrimonio neto es LIQUIDABLE (equity inmobiliaria
 * apalancada neta de costes/impuestos de venta + cartera neta del impuesto del
 * ahorro), de modo que un euro en ladrillo y un euro en bolsa son comparables.
 * Ver `lib/finance/rent-vs-buy.ts`.
 * ──────────────────────────────────────────────────────────────────────── */

/** Probabilidad / nivel en escala de 3 (0=baja, 1=media, 2=alta). */
export type Nivel3 = 0 | 1 | 2;

/**
 * Entrada de la calculadora. Todos los campos son obligatorios en el tipo
 * interno, pero `runCompararAlquilerCompra` acepta un `Partial` y rellena con
 * los valores por defecto de Madrid (`RENT_VS_BUY_DEFAULTS`).
 */
export interface RentVsBuyInput {
  gastosInicialesCompra?: number;
  gastosInicialesAlquiler?: number;
  gestionCompraAnual?: number;
  gestionAlquilerAnual?: number;
  // ── Comunes ──
  /** Precio de la vivienda que te plantearías comprar (€). */
  precioVivienda: number;
  /** Alquiler mensual de una vivienda EQUIVALENTE a la de compra (€/mes). */
  alquilerMensual: number;
  /** Ahorro disponible hoy para esto (€). */
  capitalDisponible: number;
  /** Años que te quedarías (input más sensible del modelo). */
  horizonteAnios: number;
  /** Rentabilidad bruta anual de la cartera de inversión (%). Igual en ambos. */
  rentabilidadInversionAnual: number;
  /** Inflación general (IPC) para deflactar a € de hoy (%). */
  inflacionAnual: number;
  /** Si true, muestra el patrimonio en € de hoy (reales). */
  mostrarEnReales: boolean;
  /** Si true, grava la plusvalía latente de ambas carteras al final. */
  liquidarCarteraAlFinal: boolean;

  // ── Compra ──
  /** % de entrada (banco financia el resto). */
  entradaPorcentaje: number;
  /** Tipo de interés (TIN fijo) en %. El motor admite 0%. */
  tipoInteres: number;
  /** Plazo de la hipoteca en años. */
  plazoHipotecaAnios: number;
  /** Obra nueva (IVA+AJD) vs segunda mano (ITP). */
  esObraNueva: boolean;
  /** Gastos de compra como % del precio (ITP/IVA + notaría + registro…). */
  gastosCompraPorcentaje: number;
  /** Gastos de venta como % del valor de venta (agencia + cancelación…). */
  gastosVentaPorcentaje: number;
  /** Plusvalía municipal (IIVTNU) estimada como % del valor de venta. */
  plusvaliaMunicipalPorcentaje: number;
  /** IBI anual (€). */
  ibiAnual: number;
  /** Comunidad (€/mes). */
  comunidadMensual: number;
  /** Seguro de hogar anual (€). */
  seguroHogarAnual: number;
  /** Mantenimiento anual: % del precio inicial, actualizado con inflacionCostes. */
  mantenimientoPorcentaje: number;
  /** Revalorización anual de la vivienda (%). Distinta de la cartera. */
  revalorizacionViviendaAnual: number;
  /** Inflación de gastos recurrentes: IBI, comunidad, seguros, mantenimiento y gestión (%). */
  inflacionCostes: number;
  /** Consideración de vivienda habitual; no aplica por sí sola exención fiscal. */
  viviendaHabitual: boolean;
  /** Supuesto fiscal separado y desactivado por defecto. */
  exencionGananciaVenta?: boolean;

  // ── Alquiler ──
  /** Subida anual del alquiler (%). */
  subidaAlquilerAnual: number;
  /** Seguro del inquilino anual (€). */
  seguroInquilinoAnual: number;

  // ── Personal / subjetivo ──
  /** Probabilidad de mudarte al extranjero (0=baja, 1=media, 2=alta). */
  probMudanzaExtranjero: Nivel3;
  /** Legado: años hasta mudanza. Genera un aviso, sin ejecutar venta o alquiler a terceros. */
  aniosHastaMudanza: number;
  /** Legado sin efecto financiero: no se simulan mudanzas intermedias. */
  escenarioMudanza: 0 | 1;
  /** Legado sin efecto financiero: no se simula residencia fiscal ni IRNR. */
  paisDestinoFueraUE: boolean;
  /** Colchón de liquidez que quieres mantener (€). */
  liquidezNecesaria: number;
  /** Estabilidad laboral (0=baja, 1=media, 2=alta). */
  estabilidadLaboral: Nivel3;
  /** Aumento salarial TOTAL esperado en 1–2 años (0–300%); solo informa avisos. */
  crecimientoSalarialEsperado: number;
  /** Ingreso anual neto (solo para avisos de esfuerzo; no entra en patrimonio). */
  ingresoAnualNeto: number;
}

/** Una fila de la simulación (un año cerrado). Base de todas las gráficas. */
export interface RentVsBuyYear {
  anio: number;
  /** Cuota anual pagada (interés + principal); 0 tras amortizar. */
  cuotaAnual: number;
  interesesAnio: number;
  principalAnio: number;
  /** Saldo vivo de la hipoteca al cierre del año. */
  saldoVivo: number;
  /** IBI + comunidad + seguro + mantenimiento + otros gastos de propiedad del año. */
  costesTenencia: number;
  valorVivienda: number;
  /** Valor − saldo − costes/impuestos de venta latentes. Puede ser negativo. */
  equityInmo: number;
  /** Cartera del comprador, neta del impuesto del ahorro. */
  carteraCompra: number;
  alquilerAnual: number;
  /** Cartera del inquilino, neta del impuesto del ahorro. */
  carteraAlquiler: number;
  patrimonioCompra: number;
  patrimonioAlquiler: number;
  /** patrimonioCompra − patrimonioAlquiler (signo = quién gana ese año). */
  diferencia: number;
  aporteCompra: number;
  aporteAlquiler: number;
  /** Legado: siempre cero; no se simula alquiler a terceros ni IRNR. */
  irnrAnio: number;
}

export type RentVsBuyAvisoClave =
  | "movilidad"
  | "liquidez"
  | "estabilidad"
  | "salario"
  | "esfuerzo"
  | "horizonte_corto"
  | "supuesto_agresivo"
  | "entrada_insuficiente";

/** Un aviso/factor subjetivo que matiza (sin alterar) el veredicto financiero. */
export interface RentVsBuyAviso {
  clave: RentVsBuyAvisoClave;
  severidad: "info" | "warning" | "fuerte";
  mensaje: string;
  /** A qué escenario empuja: para colorear la anotación. */
  sesgo: "pro_comprar" | "pro_alquilar" | "neutral";
}

/** Salida completa del motor. */
export interface RentVsBuyResult {
  /** Eco de los inputs efectivos (tras defaults + clamp) — trazabilidad. */
  inputs: RentVsBuyInput;
  /** N filas, una por año. */
  serie: RentVsBuyYear[];
  cuotaMensual: number;
  /** Entrada + gastos de compra. */
  desembolsoInicialCompra: number;
  /** precio / (alquiler·12). Indicador contextual, no veredicto. */
  priceToRent: number | null;
  /** Primer cruce interpolado; 1 si ya gana en el primer cierre anual; null si no alcanza. */
  breakEvenAnios: number | null;
  patrimonioFinalCompra: number;
  patrimonioFinalAlquiler: number;
  /** € a favor de comprar (negativo = a favor de alquilar). */
  ventajaCompra: number;
  /** % sobre el mayor patrimonio. */
  ventajaPorcentual: number;
  veredicto: {
    ganador: "comprar" | "alquilar";
    banda: "empate" | "moderada" | "clara";
    /** Frase determinista lista para la UI. */
    resumen: string;
    /** Si un factor subjetivo invierte la recomendación mostrada. */
    overrideSubjetivo: "comprar" | "alquilar" | null;
  };
  /** true si las cifras están deflactadas a € de hoy. */
  enReales: boolean;
  avisos: RentVsBuyAviso[];
  totales: {
    gastosInicialesCompra?: number;
    gastosInicialesAlquiler?: number;
    segurosAlquilerTotal?: number;
    gestionAlquilerTotal?: number;
    costesVentaFinal?: number;
    impuestoVentaFinal?: number;
    plusvaliaMunicipalFinal?: number;
    interesesTotales: number;
    tenenciaTotal: number;
    rentaTotal: number;
    principalTotal: number;
    gastosCompra: number;
    irnrAcumulado: number;
  };
  /** false si la entrada + gastos superan el capital disponible. */
  feasible: boolean;
  /** Precio máximo comprable con el capital actual (entrada% + gastos%). */
  precioMaxFinanciable: number;
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
  | { type: "purchase_valuation"; data: PurchaseValuation }
  | { type: "conversation"; id: string }
  | { type: "error"; message: string }
  | { type: "done" };
