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
import type {
  CommuteResult,
  MarketAnalysis,
  MortgageCalc,
  NeighborhoodReport,
  RentValuation,
} from "@/types";

/**
 * Definición visible para Claude. Las descripciones están escritas en
 * español y orientadas a *cuándo usar cada tool*, no a *qué hace*.
 * El SDK de Anthropic acepta este formato literalmente como `tools[]`.
 */
export const TOOL_DEFINITIONS = [
  {
    name: "buscar_propiedades",
    description:
      "Busca propiedades inmobiliarias en Idealista según los criterios del usuario. Úsala cuando alguien quiera encontrar pisos, casas, locales u otros inmuebles. Si no tienes zona o presupuesto y son razonables para la búsqueda, pídeselos al usuario antes de llamar a esta herramienta.",
    input_schema: {
      type: "object",
      properties: {
        zona: {
          type: "string",
          description: "Ciudad, barrio o dirección. Ej: 'Chamberí Madrid', 'Barcelona centro', 'Triana Sevilla'.",
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
            "Provincia donde está la propiedad. Ej: 'Madrid', 'Barcelona', 'Vizcaya', 'Las Palmas'.",
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
      "Valora si la renta de un alquiler es cara o barata comparándola con la referencia €/m²/mes de la zona (o de la provincia como respaldo). Úsala proactivamente cuando presentes pisos en alquiler, y siempre que el usuario pregunte si una renta está bien de precio. Necesitas la zona, la renta mensual y los metros del piso. Los datos de referencia son orientativos: dilo al verbalizarlos.",
    input_schema: {
      type: "object",
      properties: {
        zona: {
          type: "string",
          description: "Barrio o zona del piso. Ej: 'Malasaña', 'Eixample Barcelona'.",
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
      "Devuelve la seguridad y los indicadores de calidad de vida de un barrio o zona (transporte, zonas verdes, servicios, vida nocturna, tranquilidad). Úsala cuando el usuario pregunte si una zona es segura o cómo se vive allí, y proactivamente al recomendar pisos según sus prioridades. Los datos son orientativos (no oficiales en vivo): cítalos siempre como una estimación.",
    input_schema: {
      type: "object",
      properties: {
        zona: {
          type: "string",
          description: "Barrio o zona a consultar. Ej: 'Lavapiés', 'Gràcia Barcelona'.",
        },
        provincia: {
          type: "string",
          description: "Provincia, como respaldo si no hay datos del barrio.",
        },
      },
      required: ["zona"],
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
    | { kind: "neighborhood"; data: NeighborhoodReport };
}

/**
 * Despacha la llamada según `name`. Captura errores conocidos para
 * devolverlos al modelo como `tool_result` con `is_error: true` — Claude
 * sabrá interpretarlos y comunicárselos al usuario.
 */
export async function runTool(name: string, input: unknown): Promise<ToolRunResult> {
  switch (name) {
    case "buscar_propiedades": {
      const data = await runBuscarPropiedades(input as BuscarPropiedadesInput);
      // Para el modelo solo el resumen plano (sin propiedades duplicadas).
      const { properties: _omit, ...modelPayload } = data;
      void _omit;
      return { forModel: modelPayload, forClient: { kind: "properties", data } };
    }
    case "detalle_propiedad": {
      const data = await runDetallePropiedad(input as DetallePropiedadInput);
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
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}
