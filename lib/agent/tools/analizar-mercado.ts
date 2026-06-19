import { ValidationError } from "@/lib/errors";
import { getMarketData } from "@/lib/market/cache";
import { findProvincePrice } from "@/lib/market/match-province";

export interface AnalizarMercadoInput {
  provincia: string;
  precioM2: number;
  tipo?: "vivienda_libre" | "vivienda_protegida";
}

export interface AnalizarMercadoResult {
  provincia: {
    consultada: string;
    encontrada: string | null;
  };
  comparacion: {
    precioM2Propiedad: number;
    precioM2Provincia: number | null;
    diferenciaPorcentual: number | null;
    /** Lectura cualitativa: "muy por debajo", "en línea", "premium"… */
    valoracion: string | null;
  };
  tendencia: {
    /** Variación interanual del IPV en el último trimestre disponible. */
    ultimoTrimestre: { periodo: string; variacionInteranual: number } | null;
    /** Resumen direccional de los últimos 4 trimestres. */
    resumen: string | null;
    /** Serie completa por si Claude quiere citar un punto concreto. */
    serie: Array<{ periodo: string; variacionInteranual: number }>;
  };
  hipoteca: {
    tipoMedio: number | null;
    euribor12m: number | null;
    periodo: string | null;
  };
  fuentes: {
    precioProvincia: string;
    ipv: string;
    bde: string;
  };
  /** Marca de frescura del dato más antiguo, útil para que Claude lo cite. */
  actualizado: {
    precioProvincia: string | null;
    ipv: string | null;
    bde: string | null;
    /** `true` si al menos uno proviene de los datos de respaldo. */
    contieneRespaldo: boolean;
  };
  /** Aviso a verbalizar si la propiedad no es vivienda libre. */
  notaTipo?: string;
}

export async function runAnalizarMercado(
  input: AnalizarMercadoInput
): Promise<AnalizarMercadoResult> {
  if (!input?.provincia) throw new ValidationError("provincia es obligatoria");
  if (!input?.precioM2 || input.precioM2 <= 0)
    throw new ValidationError("precioM2 debe ser un número positivo");

  const [pricesByProv, ipv, bde] = await Promise.all([
    getMarketData("ine_price_by_province"),
    getMarketData("ine_ipv_quarterly"),
    getMarketData("bde_mortgage_rates"),
  ]);

  const match = findProvincePrice(pricesByProv.data.data, input.provincia);

  const diferencia =
    match != null
      ? round1(((input.precioM2 - match.precioM2) / match.precioM2) * 100)
      : null;

  const serie = ipv.data.serie;
  const ultimo = serie.length > 0 ? serie[serie.length - 1] : null;

  return {
    provincia: {
      consultada: input.provincia,
      encontrada: match ? match.provincia : null,
    },
    comparacion: {
      precioM2Propiedad: Math.round(input.precioM2),
      precioM2Provincia: match ? match.precioM2 : null,
      diferenciaPorcentual: diferencia,
      valoracion: diferencia != null ? clasificar(diferencia) : null,
    },
    tendencia: {
      ultimoTrimestre: ultimo,
      resumen: serie.length > 1 ? resumirTendencia(serie.map((p) => p.variacionInteranual)) : null,
      serie,
    },
    hipoteca: {
      tipoMedio: bde.data.tipoMedio,
      euribor12m: bde.data.euribor12m ?? null,
      periodo: bde.data.periodo,
    },
    fuentes: {
      precioProvincia: pricesByProv.data.fuente,
      ipv: ipv.data.fuente,
      bde: bde.data.fuente,
    },
    actualizado: {
      precioProvincia: pricesByProv.updatedAt,
      ipv: ipv.updatedAt,
      bde: bde.updatedAt,
      contieneRespaldo:
        pricesByProv.fromFallback || ipv.fromFallback || bde.fromFallback,
    },
    notaTipo:
      input.tipo === "vivienda_protegida"
        ? "El INE publica precios de vivienda libre; para VPO los importes oficiales suelen ser inferiores y dependen del módulo autonómico."
        : undefined,
  };
}

function clasificar(diffPct: number): string {
  if (diffPct <= -20) return "muy por debajo del precio medio de la provincia";
  if (diffPct <= -8) return "por debajo del precio medio";
  if (diffPct < 8) return "en línea con el precio medio";
  if (diffPct < 20) return "por encima del precio medio";
  return "premium frente al precio medio de la provincia";
}

function resumirTendencia(serie: number[]): string {
  const ultimo = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  const delta = ultimo - anterior;
  const direccion =
    Math.abs(delta) < 0.3 ? "estable" : delta > 0 ? "acelerando" : "moderándose";
  if (ultimo > 0) return `precios al alza, ${direccion}`;
  if (ultimo < 0) return `precios a la baja, ${direccion}`;
  return `precios planos, ${direccion}`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
