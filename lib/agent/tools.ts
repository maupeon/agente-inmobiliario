import { runValorarVivienda } from "./tools/valorar-vivienda";
import {
  runBuscarPropiedades,
  type BuscarPropiedadesInput,
  type BuscarPropiedadesResult,
} from "./tools/buscar-propiedades";
import {
  runDetallePropiedad,
  type DetallePropiedadInput,
  type DetallePropiedadResult,
} from "./tools/detalle-propiedad";
import {
  runCalcularHipoteca,
  type CalcularHipotecaInput,
} from "./tools/calcular-hipoteca";
import {
  runAnalizarMercado,
  type AnalizarMercadoInput,
} from "./tools/analizar-mercado";
import {
  runValorarAlquiler,
  type ValorarAlquilerInput,
} from "./tools/valorar-alquiler";
import {
  runCalcularTrayecto,
  type CalcularTrayectoInput,
} from "./tools/calcular-trayecto";
import {
  runConsultarBarrio,
  type ConsultarBarrioInput,
} from "./tools/consultar-barrio";
import {
  runCompararAlquilerCompraTool,
  type CompararAlquilerCompraInput,
} from "./tools/comparar-alquiler-compra";
import type {
  CommuteResult,
  MarketAnalysis,
  MortgageCalc,
  NeighborhoodReport,
  RentValuation,
  PurchaseValuation,
} from "@/types";

/**
 * Definición visible para Claude. Las descripciones están escritas en
 * español y orientadas a *cuándo usar cada tool*, no a *qué hace*.
 * El SDK de Anthropic acepta este formato literalmente como `tools[]`.
 */
export const TOOL_DEFINITIONS = [
  {
    name: "valorar_vivienda",
    description: "Estima un piso de compra o alquiler en Madrid con el mismo predictor que el panel. Conserva operation del anuncio: sale compara euros totales, rent compara euros al mes con la renta derivada del valor de venta y ratios distritales del periodo que devuelva el predictor. El alquiler no tiene validación independiente. Usa solo campos observados de buscar_propiedades o aportados por el usuario; no inventes coordenadas ni características. Respeta estado, unidades y advertencias.",
    input_schema: {
      type: "object", additionalProperties: false,
      properties: {
        propertyCode: { type: "string" }, price: { type: "number" }, size: { type: "number" },
        operation: { type: "string", enum: ["sale", "rent"], description: "Operación observada: price es mensual para rent y total para sale." },
        latitude: { type: "number" }, longitude: { type: "number" }, municipality: { type: "string" },
        propertyType: { type: "string" }, rooms: { type: "number" }, bathrooms: { type: "number" },
        floor: { type: "string" }, hasLift: { type: "boolean" }, exterior: { type: "boolean" },
        description: { type: "string", maxLength: 12000, description: "Descripción literal observada del anuncio; el predictor extrae sus características." },
        parkingSpace: { type: "object", properties: { hasParkingSpace: { type: "boolean" } } },
        sourceKind: { type: "string", enum: ["idealista", "demo"] },
        detailedType: { type: "object", properties: { typology: { type: "string" }, subTypology: { type: "string" } } },
      },
      required: ["propertyCode", "operation", "price", "size", "latitude", "longitude", "municipality", "propertyType"],
    },
  },
  {
    name: "buscar_propiedades",
    description:
      "Busca propiedades inmobiliarias en Idealista exclusivamente en Madrid capital, según los criterios del usuario. Úsala cuando alguien quiera encontrar pisos, casas, locales u otros inmuebles. Si no tienes zona o presupuesto y son razonables para la búsqueda, pídeselos al usuario antes de llamar a esta herramienta.",
    input_schema: {
      type: "object",
      properties: {
        zona: {
          type: "string",
          description: "Barrio o dirección de Madrid capital. Ej: 'Chamberí, Madrid', 'Retiro', 'Gran Vía 28, Madrid'. Otras ciudades y municipios no están disponibles.",
        },
        operacion: {
          type: "string",
          enum: ["venta", "alquiler"],
          description: "Tipo de operación.",
        },
        tipo: {
          type: "string",
          enum: ["pisos", "casas", "locales", "garajes"],
          description: "Tipo de inmueble. Por defecto 'pisos'.",
        },
        precioMax: { type: "number", description: "Precio máximo en euros." },
        precioMin: { type: "number", description: "Precio mínimo en euros." },
        metrosMin: { type: "number", description: "Metros cuadrados mínimos." },
        habitaciones: {
          type: "number",
          description: "Número mínimo de habitaciones.",
        },
      },
      required: ["zona", "operacion"],
    },
  },
  {
    name: "detalle_propiedad",
    description:
      "Obtiene la ficha completa de una propiedad: descripción, características, fotos y URL del anuncio. Úsala cuando el usuario quiera saber más sobre un inmueble concreto que ya hayas listado con buscar_propiedades. Necesitas el propertyCode exacto.",
    input_schema: {
      type: "object",
      properties: {
        propertyCode: {
          type: "string",
          description: "Código de la propiedad obtenido en buscar_propiedades.",
        },
      },
      required: ["propertyCode"],
    },
  },
  {
    name: "calcular_hipoteca",
    description:
      "Calcula la cuota mensual de una hipoteca y el coste total de un préstamo, además del % de esfuerzo sobre un salario medio (2.200 €/mes). Úsala cuando el usuario pregunte por financiación, cuotas o quiera saber si se puede permitir una compra. No requiere conexión externa.",
    input_schema: {
      type: "object",
      properties: {
        precioPropiedad: { type: "number", description: "Precio del inmueble en euros." },
        entradaPorcentaje: {
          type: "number",
          description: "Porcentaje de entrada. Por defecto 20.",
        },
        plazoAnios: {
          type: "number",
          description: "Plazo en años. Por defecto 30.",
        },
        tipoInteres: {
          type: "number",
          description: "Tipo de interés anual en porcentaje (ej: 3.5). Por defecto 3.5.",
        },
      },
      required: ["precioPropiedad"],
    },
  },
  {
    name: "analizar_mercado",
    description:
      "Compara el precio €/m² de una propiedad con el precio medio de la provincia (INE), describe la tendencia de los últimos trimestres del Índice de Precios de la Vivienda y aporta el tipo hipotecario medio del Banco de España. Úsala proactivamente cuando presentes una propiedad cara (más de 500.000 €), cuando el usuario pregunte si un precio es razonable o cómo está el mercado en una zona, y antes de recomendar comprar. No inventes datos: si la herramienta no devuelve un valor, dilo.",
    input_schema: {
      type: "object",
      properties: {
        provincia: {
          type: "string",
          description:
            "Provincia de la vivienda: Madrid. La búsqueda del proyecto cubre Madrid capital.",
        },
        precioM2: {
          type: "number",
          description: "Precio por metro cuadrado de la propiedad a analizar, en euros.",
        },
        tipo: {
          type: "string",
          enum: ["vivienda_libre", "vivienda_protegida"],
          description: "Tipo de vivienda. Por defecto 'vivienda_libre'.",
        },
      },
      required: ["provincia", "precioM2"],
    },
  },
  {
    name: "valorar_alquiler",
    description:
      "Consulta una referencia territorial documentada de renta en €/m²/mes. Para estimar un anuncio de alquiler con sus atributos y coordenadas usa valorar_vivienda con operation=rent. Esta herramienta territorial requiere zona, renta mensual y metros; si falta una fuente verificada, indica la ausencia y no clasifiques el alquiler como barato o caro.",
    input_schema: {
      type: "object",
      properties: {
        zona: {
          type: "string",
          description: "Barrio o zona del piso. Ej: 'Malasaña, Madrid', 'Chamberí, Madrid'.",
        },
        provincia: {
          type: "string",
          description: "Provincia, como respaldo si no hay datos del barrio. Ej: 'Madrid'.",
        },
        precioMes: { type: "number", description: "Renta mensual del anuncio en euros." },
        metros: { type: "number", description: "Superficie del piso en m²." },
      },
      required: ["zona", "precioMes", "metros"],
    },
  },
  {
    name: "calcular_trayecto",
    description:
      "Calcula cuánto se tarda del lugar de trabajo del usuario a una vivienda andando, en bici, en coche y en transporte público. Úsala cuando el usuario tenga un lugar de trabajo definido y quieras valorar la conexión de un piso, o cuando pregunte por el trayecto o la distancia al trabajo. Pasa la dirección del trabajo en origenDireccion (y origenLat/origenLon si las conoces del perfil) y la zona o dirección de la vivienda en destino.",
    input_schema: {
      type: "object",
      properties: {
        origenDireccion: {
          type: "string",
          description: "Dirección o nombre del lugar de trabajo. Ej: 'Calle Gran Vía 28, Madrid'.",
        },
        origenLat: { type: "number", description: "Latitud del trabajo, si la conoces del perfil." },
        origenLon: { type: "number", description: "Longitud del trabajo, si la conoces del perfil." },
        destino: {
          type: "string",
          description: "Barrio, zona o dirección de la vivienda. Ej: 'Malasaña, Madrid'.",
        },
        destinoLat: { type: "number", description: "Latitud de la vivienda, si la conoces." },
        destinoLon: { type: "number", description: "Longitud de la vivienda, si la conoces." },
        modoPreferido: {
          type: "string",
          enum: ["a_pie", "bici", "coche", "transporte"],
          description: "Modo de transporte preferido del usuario, si lo sabes.",
        },
      },
      required: ["origenDireccion", "destino"],
    },
  },
  {
    name: "consultar_barrio",
    description:
      "Informa de que no hay indicadores de seguridad verificados a escala de barrio. Los índices manuales están retirados; no los inventes ni clasifiques barrios como seguros o peligrosos.",
    input_schema: {
      type: "object",
      properties: {
        zona: {
          type: "string",
          description: "Barrio o zona a consultar. Ej: 'Lavapiés, Madrid', 'Retiro, Madrid'.",
        },
        provincia: {
          type: "string",
          description: "Provincia, como respaldo si no hay datos del barrio.",
        },
      },
      required: ["zona"],
    },
  },
  {
    name: "comparar_alquiler_compra",
    description:
      "Compara si conviene COMPRAR o ALQUILAR e invertir, maximizando el patrimonio neto a largo plazo (no solo el coste). Compara ambas opciones desde hoy con el mismo capital y presupuesto, gastos iniciales y recurrentes, revalorización de la vivienda, cartera de inversión e impuestos estimados. Valora una venta hipotética al final de cada año; no simula una mudanza intermedia, ingresos por alquilar a terceros ni IRNR. Los supuestos iniciales son ejemplos editables, no previsiones validadas. Úsala cuando el usuario dude entre comprar o alquilar, pregunte qué le renta más, o cuando convenga el análisis patrimonial antes de recomendar una compra. Todos los parámetros son opcionales: usa valores por defecto de Madrid y pregunta por los que falten si son relevantes (precio, alquiler equivalente, ahorro, horizonte). Menciona que el desglose visual está en la pestaña «Comprar o alquilar».",
    input_schema: {
      type: "object",
      properties: {
        precioVivienda: { type: "number", description: "Precio de la vivienda a comprar, en euros. Por defecto 400000." },
        alquilerMensual: { type: "number", description: "Alquiler mensual de una vivienda EQUIVALENTE, en euros. Por defecto 1250." },
        capitalDisponible: { type: "number", description: "Ahorro disponible hoy, en euros. Por defecto 120000." },
        horizonteAnios: { type: "number", minimum: 1, maximum: 40, description: "Años de comparación de ambas opciones desde hoy. Por defecto 10." },
        entradaPorcentaje: { type: "number", description: "Porcentaje de entrada. Por defecto 20." },
        tipoInteres: { type: "number", description: "Tipo de interés fijo de la hipoteca en %. Por defecto 3." },
        plazoHipotecaAnios: { type: "number", description: "Plazo de la hipoteca en años. Por defecto 30." },
        rentabilidadInversionAnual: { type: "number", description: "Rentabilidad anual esperada de la cartera de inversión en %. Por defecto 7." },
        revalorizacionViviendaAnual: { type: "number", description: "Revalorización anual de la vivienda en %. Por defecto 4." },
        subidaAlquilerAnual: { type: "number", description: "Subida anual del alquiler en %. Por defecto 4." },
        esObraNueva: { type: "boolean", description: "Primera entrega de vivienda nueva. Si no se indica gastosCompraPorcentaje, propone 11,5% de gasto total; ese porcentaje es un ejemplo, no un tipo tributario." },
        gastosCompraPorcentaje: { type: "number", minimum: 0, maximum: 25, description: "Total de impuestos y trámites de compra como % del precio, incluidos ITP o IVA/AJD, notaría, registro, gestoría y tasación. Se aplica exactamente una vez, sin otro impuesto añadido." },
        gastosInicialesCompra: { type: "number", minimum: 0, maximum: 500000, description: "Otros gastos iniciales de compra en euros: muebles, mudanza o equipamiento. No recuperables en el modelo. No duplicar trámites ni capitalizar reformas aquí." },
        gastosInicialesAlquiler: { type: "number", minimum: 0, maximum: 500000, description: "Otros gastos iniciales del inquilino en euros, sin valor residual: mudanza, muebles, equipamiento. Excluye fianzas recuperables." },
        gestionCompraAnual: { type: "number", minimum: 0, maximum: 50000, description: "Servicios recurrentes del propietario en euros/año no incluidos en comunidad, seguro ni mantenimiento." },
        gestionAlquilerAnual: { type: "number", minimum: 0, maximum: 50000, description: "Otros costes propios del inquilino en euros/año. No trasladar gastos de gestión inmobiliaria ni formalización del alquiler de vivienda, que corresponden al arrendador según LAU art. 20." },
        ibiAnual: { type: "number", minimum: 0, maximum: 10000, description: "Recibo del IBI de un año completo, en euros/año." },
        comunidadMensual: { type: "number", minimum: 0, maximum: 1000, description: "Gastos de comunidad en euros/mes." },
        mantenimientoPorcentaje: { type: "number", minimum: 0, maximum: 3, description: "Mantenimiento anual como % del precio inicial, actualizado por inflación de gastos. El 1% predeterminado es un supuesto sin validación empírica." },
        inflacionCostes: { type: "number", minimum: 0, maximum: 8, description: "Subida anual de gastos recurrentes (%). Independiente de la vivienda y de la renta." },
        ingresoAnualNeto: { type: "number", minimum: 12000, maximum: 500000, description: "Ingreso anual NETO ACTUAL, euros/año. Solo avisos de esfuerzo; no se suma a las carteras." },
        crecimientoSalarialEsperado: { type: "number", minimum: 0, maximum: 300, description: "Aumento salarial TOTAL previsto en 1–2 años, hasta el 300%. No es anual y no cambia el patrimonio: solo informa avisos." },
        liquidezNecesaria: { type: "number", description: "Colchón de liquidez que el usuario quiere mantener, en euros." },
      },
      required: [],
    },
  },
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number]["name"];

export interface ToolRunResult {
  /** Lo que devolvemos al modelo como `tool_result.content`. */
  forModel: unknown;
  /** Datos enriquecidos para empujar al cliente vía SSE. */
  forClient?:
    | { kind: "properties"; data: BuscarPropiedadesResult }
    | { kind: "detail"; data: DetallePropiedadResult }
    | { kind: "mortgage"; data: MortgageCalc }
    | { kind: "market"; data: MarketAnalysis }
    | { kind: "rent"; data: RentValuation }
    | { kind: "commute"; data: CommuteResult }
    | { kind: "neighborhood"; data: NeighborhoodReport }
    | { kind: "purchase_valuation"; data: PurchaseValuation };
}

/**
 * Despacha la llamada según `name`. Captura errores conocidos para
 * devolverlos al modelo como `tool_result` con `is_error: true` — Claude
 * sabrá interpretarlos y comunicárselos al usuario.
 */
export async function runTool(name: string, input: unknown): Promise<ToolRunResult> {
  switch (name) {
    case "valorar_vivienda": {
      const data = await runValorarVivienda(input);
      return { forModel: data, forClient: { kind: "purchase_valuation", data } };
    }
    case "buscar_propiedades": {
      const data = await runBuscarPropiedades(input as BuscarPropiedadesInput);
      // Para el modelo solo el resumen plano (sin propiedades duplicadas).
      const { properties: _omit, ...modelPayload } = data;
      void _omit;
      return { forModel: modelPayload, forClient: { kind: "properties", data } };
    }
    case "detalle_propiedad": {
      const data = await runDetallePropiedad(input as DetallePropiedadInput);
      if (!data) {
        // La API real no da ficha ampliada: que Claude use los datos ya
        // mostrados en la búsqueda y enlace al anuncio (sin gastar cuota).
        return {
          forModel: {
            available: false,
            note: "La API de Idealista no ofrece ficha ampliada (descripción/fotos extra). Usa los datos del anuncio ya mostrados en la búsqueda y remite al usuario al enlace de idealista.com para ver más.",
          },
        };
      }
      const { property: _omit, photos: _photos, ...modelPayload } = data;
      void _omit;
      return {
        forModel: { ...modelPayload, photoCount: _photos.length },
        forClient: { kind: "detail", data },
      };
    }
    case "calcular_hipoteca": {
      const data = runCalcularHipoteca(input as CalcularHipotecaInput);
      return { forModel: data, forClient: { kind: "mortgage", data } };
    }
    case "analizar_mercado": {
      const data = await runAnalizarMercado(input as AnalizarMercadoInput);
      return { forModel: data, forClient: { kind: "market", data } };
    }
    case "valorar_alquiler": {
      const data = await runValorarAlquiler(input as ValorarAlquilerInput);
      return { forModel: data, forClient: { kind: "rent", data } };
    }
    case "calcular_trayecto": {
      const data = await runCalcularTrayecto(input as CalcularTrayectoInput);
      return { forModel: data, forClient: { kind: "commute", data } };
    }
    case "consultar_barrio": {
      const data = await runConsultarBarrio(input as ConsultarBarrioInput);
      return { forModel: data, forClient: { kind: "neighborhood", data } };
    }
    case "comparar_alquiler_compra": {
      const data = runCompararAlquilerCompraTool(input as CompararAlquilerCompraInput);
      return { forModel: data };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}
