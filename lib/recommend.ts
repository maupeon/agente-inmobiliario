import "server-only";
import { enrichProperties } from "@/lib/enrich";
import { narrateRecommendations } from "@/lib/ai-insights";
import { searchProperties } from "@/lib/idealista/search";
import { personalScore, satisfiesMust } from "@/lib/personal-score";
import { recommendationExplanation } from "@/lib/recommend-explanation";
import type {
  PropertyEnrichment,
  PropertyRecommendation,
  SearchFilters,
  UserProfile,
} from "@/types";

export interface RecommendInput {
  /** Desactivar narración pagada para procesos automáticos. */
  narrate?: boolean;
  profile?: UserProfile | null;
  /** Overrides desde los controles de filtro del panel. */
  zona?: string;
  operacion?: "venta" | "alquiler";
  tipo?: "pisos" | "casas";
  /** null elimina expresamente el límite del perfil. */
  precioMax?: number | null;
  habitaciones?: number | null;
}

export interface RecommendResult {
  filters: SearchFilters | null;
  items: PropertyRecommendation[];
  /** Resumen "para ti" redactado por la IA (null si no disponible). */
  intro?: string | null;
}

/** Cuántos candidatos pedimos para luego quedarnos con los mejores. */
const CANDIDATES = 8;
const TOP_N = 5;

/**
 * Recomendador "para ti": busca en Idealista a partir del perfil (o de los
 * filtros), enriquece cada piso (precio/ubicación/trayecto) y los ordena por
 * encaje con lo que le importa al usuario. Devuelve los 3-5 mejores con una
 * explicación legible de por qué encajan.
 */
export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  const profile = input.profile ?? null;
  const zona = (input.zona ?? profile?.zona ?? "").trim();
  if (!zona) return { filters: null, items: [] };

  const operacion = input.operacion ?? profile?.operacion ?? "alquiler";
  const precioMax = input.precioMax === null ? undefined : input.precioMax ?? profile?.presupuestoMax;
  const habitaciones = input.habitaciones === null ? undefined : input.habitaciones ?? profile?.habitaciones;
  const usesProfileZone =
    input.zona == null ||
    input.zona.trim().localeCompare(profile?.zona?.trim() ?? "", "es", {
      sensitivity: "base",
    }) === 0;

  const filters: SearchFilters = {
    zona,
    operacion,
    tipo: input.tipo ?? profile?.tipo ?? "pisos",
    precioMax,
    habitaciones,
    // Conserva el punto del mapa; la búsqueda comprueba tanto sus coordenadas
    // como la zona para impedir que un perfil antiguo eluda el ámbito de Madrid.
    centro:
      usesProfileZone && profile?.zonaLat != null && profile?.zonaLon != null
        ? { lat: profile.zonaLat, lon: profile.zonaLon }
        : undefined,
  };

  const candidates = (await searchProperties(filters, CANDIDATES)).filter((p) =>
    (precioMax == null || p.price <= precioMax)
    && (habitaciones == null || p.rooms == null || p.rooms >= habitaciones)
    && (profile?.imprescindibles ?? []).every((m) => satisfiesMust(p, m) !== false));
  if (candidates.length === 0) return { filters, items: [] };

  // Una zona cambiada manualmente no conserva el punto de ubicación del perfil.
  const effectiveProfile = profile ? { ...profile, presupuestoMax: precioMax, ...(usesProfileZone ? {} : { zonaLat: undefined, zonaLon: undefined }) } : null;
  const enriched = await enrichProperties(candidates, effectiveProfile);
  const byCode = new Map(enriched.map((e) => [e.propertyCode, e]));

  const scored = candidates.map((p) => {
    const enrichment: PropertyEnrichment =
      byCode.get(p.propertyCode) ?? {
        propertyCode: p.propertyCode,
        valuation: null,
        commute: null,
        neighborhood: null,
      };
    const { score, scoring } = personalScore(p, enrichment, effectiveProfile);
    const { highlights, rationale } = recommendationExplanation(p, enrichment, effectiveProfile);
    return { property: p, enrichment, score, scoring, highlights, rationale };
  });

  scored.sort((a, b) => b.score - a.score);
  const items = scored.slice(0, TOP_N);

  // Capa "agéntica": Claude reescribe el porqué y añade un intro. Si no hay
  // clave / falla / tarda, se conserva la explicación determinista.
  const narration = input.narrate === false ? null : await narrateRecommendations(profile, items);
  let intro: string | null = null;
  if (narration) {
    intro = narration.intro;
    for (const it of items) {
      const why = narration.byCode[it.property.propertyCode];
      if (why) it.rationale = why;
    }
  }

  return { filters, items, intro };
}
