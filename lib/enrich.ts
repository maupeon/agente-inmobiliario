import "server-only";
import { computeCommute, geocodeAddress } from "@/lib/commute";
import { lookupPlace } from "@/lib/commute/places";
import { getMarketData } from "@/lib/market/cache";
import { findProvincePrice } from "@/lib/market/match-province";
import { findRentReference } from "@/lib/market/rent";
import { buildNeighborhoodReport } from "@/lib/neighborhood/report";
import { valorarLoteConEstado } from "@/lib/valoracion/client";
import type { ValoracionModelo } from "@/lib/valoracion/types";
import type {
  CommuteMode,
  CommuteResult,
  Property,
  PropertyEnrichment,
  PropertyValuation,
  UserProfile,
} from "@/types";

/**
 * Enriquecimiento por lote de propiedades para el panel/mapa.
 *
 * Para cada piso conserva la estimación o abstención del servicio, las
 * referencias territoriales con procedencia y el trayecto aproximado.
 * El informe de barrio declara ausencia de medición de seguridad/calidad.
 *
 * Los datasets de mercado se piden UNA vez y se reutilizan para todo el lote,
 * en lugar de invocar las tools una por una (que harían N lecturas a Supabase).
 */
export async function enrichProperties(
  properties: Property[],
  profile?: UserProfile | null
): Promise<PropertyEnrichment[]> {
  if (properties.length === 0) return [];

  // Datasets de mercado, una sola vez.
  const [rentRef, prices, lote] = await Promise.all([
    getMarketData("rent_reference"),
    getMarketData("ine_price_by_province"),
    valorarLoteConEstado(properties),
  ]);

  // Resultados y abstenciones del servicio se conservan por anuncio. Una
  // referencia territorial verificada puede mostrarse como alternativa explícita.
  const porModelo = lote.resultados;

  // Origen del trayecto: coordenadas del trabajo (del perfil), geocodificando
  // una sola vez si solo tenemos la dirección.
  const origen = await resolveWorkOrigin(profile);
  const modoPreferido: CommuteMode = profile?.trabajo?.modo ?? "transporte";

  return Promise.all(
    properties.map(async (p) => ({
      propertyCode: p.propertyCode,
      valuation: (() => {
        const v = conComparativa(desdeModelo(p, porModelo.get(p.propertyCode)), valuate(p, rentRef, prices));
        const state = lote.estados.get(p.propertyCode);
        return v && p.operation === "sale" ? { ...v, estadoModelo: state?.estado, avisoModelo: state?.motivo } : v;
      })(),
      neighborhood: buildNeighborhoodReport(zonaOf(p), provinciaOf(p)),
      commute: await commuteFor(p, origen, modoPreferido),
    }))
  );
}

// ─── Valoración de precio ───────────────────────────────────────────────────

type Banda = NonNullable<PropertyValuation["banda"]>;

/**
 * Devuelve la valoración del modelo con la de referencia adosada, para poder
 * contrastarlas en la ficha. Si el modelo no respondió, se usa la de referencia
 * con estado explícito del modelo. La referencia territorial no clasifica
 * el precio individual cuando falta la estimación del modelo.
 */
function conComparativa(
  modelo: PropertyValuation | null,
  referencia: PropertyValuation | null
): PropertyValuation | null {
  if (!modelo) return referencia ? { ...referencia, banda: null, diferenciaPorcentual: null,
    etiqueta: referencia.referenciaEurM2 == null ? "sin referencia verificada" : "referencia territorial, sin valoración individual" } : null;
  if (!referencia || referencia.fromFallback || referencia.referenciaEurM2 == null) return modelo;
  return {
    ...modelo,
    comparativa: {
      referenciaEurM2: referencia.referenciaEurM2,
      fuente: referencia.fuente ?? "Fuente sin identificar",
      periodo: referencia.periodo ?? "Periodo sin identificar",
      territorio: referencia.referencia ?? "Territorio sin identificar",
    },
  };
}

function desdeModelo(
  p: Property,
  v: ValoracionModelo | undefined
): PropertyValuation | null {
  if (!v || p.size <= 0) return null;
  const eurM2 = p.pricePerSqm ?? round1(p.price / p.size);
  const banda = (v.banda ?? null) as Banda | null;
  return {
    operacion: "venta",
    eurM2,
    referenciaEurM2: round1(v.precio_justo / p.size),
    diferenciaPorcentual: v.brecha_pct,
    etiqueta: v.brecha_pct == null ? null : v.brecha_pct < -4 ? "por debajo de la estimación indexada" : v.brecha_pct > 8 ? "por encima de la estimación indexada" : "cerca de la estimación indexada",
    banda,
    nivel: "modelo",
    referencia: `oferta 2018 · escenario indexado a ${v.nivel_precios}`,
    fromFallback: false,
    intervalo: v.intervalo,
    oportunidad: v.oportunidad,
    nivelPrecios: v.nivel_precios,
    modeloVersion: v.model_version,
  };
}

const VALORACION_ALQUILER: Record<Banda, string> = {
  barato: "barato para lo que se paga en la zona",
  ajustado: "ligeramente por debajo de la media de la zona",
  en_linea: "en línea con la media de la zona",
  caro: "por encima de la media de la zona",
  muy_caro: "bastante caro frente a la media de la zona",
};

const VALORACION_VENTA: Record<Banda, string> = {
  barato: "muy por debajo del precio medio de la provincia",
  ajustado: "por debajo del precio medio",
  en_linea: "en línea con el precio medio",
  caro: "por encima del precio medio",
  muy_caro: "premium frente al precio medio de la provincia",
};

function valuate(
  p: Property,
  rentRef: Awaited<ReturnType<typeof getMarketData<"rent_reference">>>,
  prices: Awaited<ReturnType<typeof getMarketData<"ine_price_by_province">>>
): PropertyValuation | null {
  const eurM2 = p.pricePerSqm ?? (p.size > 0 ? round1(p.price / p.size) : 0);
  if (!eurM2) return null;

  if (p.operation === "rent") {
    const match = rentRef.fromFallback ? null : findRentReference(rentRef.data, zonaOf(p), provinciaOf(p));
    const referencia = match?.eurM2Mes ?? null;
    const diff =
      referencia != null ? round1(((eurM2 - referencia) / referencia) * 100) : null;
    const banda = classify(diff);
    return {
      operacion: "alquiler",
      eurM2,
      referenciaEurM2: referencia,
      diferenciaPorcentual: diff,
      etiqueta: banda ? VALORACION_ALQUILER[banda] : null,
      banda,
      nivel: match?.nivel ?? null,
      referencia: match?.referencia ?? null,
      fromFallback: rentRef.fromFallback,
      fuente: rentRef.data.fuente,
      periodo: rentRef.data.periodo,
    };
  }

  const match = prices.fromFallback ? null : findProvincePrice(prices.data.data, provinciaOf(p) || zonaOf(p));
  const referencia = match?.precioM2 ?? null;
  const diff =
    referencia != null ? round1(((eurM2 - referencia) / referencia) * 100) : null;
  const banda = classify(diff);
  return {
    operacion: "venta",
    eurM2,
    referenciaEurM2: referencia,
    diferenciaPorcentual: diff,
    etiqueta: banda ? VALORACION_VENTA[banda] : null,
    banda,
    nivel: match ? "provincia" : null,
    referencia: match ? `provincia de ${match.provincia}` : null,
    fromFallback: prices.fromFallback,
    fuente: prices.data.fuente,
    periodo: prices.data.periodo,
  };
}

function classify(diffPct: number | null): Banda | null {
  if (diffPct == null) return null;
  if (diffPct <= -12) return "barato";
  if (diffPct <= -4) return "ajustado";
  if (diffPct < 8) return "en_linea";
  if (diffPct < 20) return "caro";
  return "muy_caro";
}

// ─── Trayecto ────────────────────────────────────────────────────────────────

interface Origin {
  lat: number;
  lon: number;
  direccion: string;
}

async function resolveWorkOrigin(
  profile?: UserProfile | null
): Promise<Origin | null> {
  const trabajo = profile?.trabajo;
  if (!trabajo) return null;
  if (trabajo.lat != null && trabajo.lon != null) {
    return { lat: trabajo.lat, lon: trabajo.lon, direccion: trabajo.direccion };
  }
  if (!trabajo.direccion) return null;

  const local = lookupPlace(trabajo.direccion);
  if (local) return { ...local, direccion: trabajo.direccion };

  const geo = await geocodeAddress(trabajo.direccion);
  if (geo) return { lat: geo.lat, lon: geo.lon, direccion: trabajo.direccion };
  return null;
}

async function commuteFor(
  p: Property,
  origen: Origin | null,
  modoPreferido: CommuteMode
): Promise<CommuteResult | null> {
  if (!origen) return null;
  if (p.latitude == null || p.longitude == null) return null;

  try {
    return await computeCommute({
      origen,
      destino: {
        lat: p.latitude,
        lon: p.longitude,
        etiqueta: p.district || p.address || p.municipality || "vivienda",
      },
      modos: [modoPreferido],
      preferido: modoPreferido,
    });
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function zonaOf(p: Property): string {
  return p.district || p.municipality || p.province || "";
}

function provinciaOf(p: Property): string | undefined {
  return p.province || p.municipality || undefined;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
