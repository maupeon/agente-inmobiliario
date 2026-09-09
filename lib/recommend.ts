import "server-only";
import { enrichProperties } from "@/lib/enrich";
import { narrateRecommendations } from "@/lib/ai-insights";
import { searchProperties } from "@/lib/idealista/search";
import { MODE_LABEL, formatDiff } from "@/lib/dashboard-format";
import type {
  Imprescindible,
  Property,
  PropertyEnrichment,
  PropertyRecommendation,
  SearchFilters,
  UserProfile,
} from "@/types";

type Banda = "barato" | "ajustado" | "en_linea" | "caro" | "muy_caro";

export interface RecommendInput {
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
 * filtros), enriquece cada piso (precio/seguridad/trayecto) y los ordena por
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
    // Coordenadas exactas del punto elegido en el mapa del onboarding: evita
    // geocodificar la zona y centra la búsqueda donde el usuario marcó.
    centro:
      usesProfileZone && profile?.zonaLat != null && profile?.zonaLon != null
        ? { lat: profile.zonaLat, lon: profile.zonaLon }
        : undefined,
  };

  const candidates = (await searchProperties(filters, CANDIDATES)).filter((p) => (profile?.imprescindibles ?? []).every((m) => satisfiesMust(p, m) !== false));
  if (candidates.length === 0) return { filters, items: [] };

  const enriched = await enrichProperties(candidates, profile);
  const byCode = new Map(enriched.map((e) => [e.propertyCode, e]));

  const scored = candidates.map((p) => {
    const enrichment: PropertyEnrichment =
      byCode.get(p.propertyCode) ?? {
        propertyCode: p.propertyCode,
        valuation: null,
        commute: null,
        neighborhood: null,
      };
    const { score, highlights, rationale } = scoreOne(p, enrichment, profile, precioMax);
    return { property: p, enrichment, score, highlights, rationale };
  });

  scored.sort((a, b) => b.score - a.score);
  const items = scored.slice(0, TOP_N);

  // Capa "agéntica": Claude reescribe el porqué y añade un intro. Si no hay
  // clave / falla / tarda, se conserva la explicación determinista.
  const narration = await narrateRecommendations(profile, items);
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

// ─── Puntuación ───────────────────────────────────────────────────────────────

const VALUE_SCORE: Record<Banda, number> = {
  barato: 1,
  ajustado: 0.85,
  en_linea: 0.62,
  caro: 0.32,
  muy_caro: 0.12,
};

function scoreOne(
  p: Property,
  e: PropertyEnrichment,
  profile: UserProfile | null,
  precioMax?: number
): { score: number; highlights: string[]; rationale: string } {
  const prioridades = profile?.prioridades ?? [];
  const hasWork = profile?.trabajo?.lat != null && profile?.trabajo?.lon != null;

  // Componentes 0..1.
  const value = e.valuation?.banda && !e.valuation.fromFallback && e.valuation.nivel === "modelo" ? VALUE_SCORE[e.valuation.banda] : 0.5;
  const budget = budgetScore(p.price, precioMax);
  const commute = commuteScore(e, hasWork);
  const musts = profile?.imprescindibles ?? [];
  const must = mustScore(p, musts);

  // Pesos base, reforzados por las prioridades del usuario.
  const w = { value: 1, budget: 1, commute: 1, must: musts.length ? 1 : 0 };
  for (const prio of prioridades) {
    if (prio === "cerca_trabajo") w.commute += 1.2;
  }
  if (!hasWork) w.commute = 0; // sin trabajo, el trayecto no puntúa

  const total = w.value + w.budget + w.commute + w.must;
  const raw =
    w.value * value +
    w.budget * budget +
    w.commute * commute +
    w.must * must;
  const score = Math.round((raw / total) * 100);

  const { highlights, rationale } = explain(p, e, profile);
  return { score, highlights, rationale };
}

function budgetScore(price: number, precioMax?: number): number {
  if (!precioMax || precioMax <= 0) return 0.6;
  if (price > precioMax) return 0.15;
  // Dentro de presupuesto: bien; un poco mejor cuanto más holgura.
  return clamp01(0.7 + 0.3 * (1 - price / precioMax));
}

function commuteScore(e: PropertyEnrichment, hasWork: boolean): number {
  if (!hasWork) return 0.5;
  const c = e.commute;
  const leg = c?.modos.find((m) => m.modo === c.recomendado);
  const min = leg?.minutos;
  if (min == null) return 0.4;
  if (min <= 10) return 1;
  if (min >= 60) return 0.05;
  return clamp01(1 - (min - 10) / 50);
}

function mustScore(p: Property, musts: Imprescindible[]): number {
  if (!musts.length) return 0.5;
  let evaluable = 0;
  let met = 0;
  for (const m of musts) {
    const sat = satisfiesMust(p, m);
    if (sat === null) continue;
    evaluable++;
    if (sat) met++;
  }
  return evaluable === 0 ? 0.5 : met / evaluable;
}

/** `null` cuando no hay dato para evaluarlo (p. ej. features no vienen en la búsqueda). */
function satisfiesMust(p: Property, m: Imprescindible): boolean | null {
  if (m === "ascensor") return p.hasLift ?? null;
  if (m === "exterior") return p.exterior ?? null;
  if (!p.features || p.features.length === 0) return null;
  const f = p.features.map((x) => x.toLowerCase());
  switch (m) {
    case "terraza":
      return f.some((x) => x.includes("terraza") || x.includes("balc"));
    case "aire_acondicionado":
      return f.some((x) => x.includes("aire"));
    case "amueblado":
      return f.some((x) => x.includes("amuebl"));
    case "garaje":
      return f.some((x) => x.includes("garaje") || x.includes("parking") || x.includes("plaza"));
    case "trastero":
      return f.some((x) => x.includes("trastero"));
    default:
      return null;
  }
}

const MUST_LABEL: Record<Imprescindible, string> = {
  ascensor: "con ascensor",
  exterior: "exterior",
  terraza: "con terraza o balcón",
  aire_acondicionado: "con aire acondicionado",
  amueblado: "amueblado",
  garaje: "con garaje",
  trastero: "con trastero",
};

// ─── Explicación ("por qué encaja contigo") ─────────────────────────────────────

function explain(
  p: Property,
  e: PropertyEnrichment,
  profile: UserProfile | null
): { highlights: string[]; rationale: string } {
  const highlights: string[] = [];
  for (const must of profile?.imprescindibles ?? []) {
    const sat = satisfiesMust(p, must);
    highlights.push(sat === true ? MUST_LABEL[must] : `${MUST_LABEL[must]}: no comprobado`);
  }
  // Trayecto (prioritario si le importa estar cerca del trabajo).
  const c = e.commute;
  const leg = c?.modos.find((m) => m.modo === c.recomendado);
  if (leg?.minutos != null && c?.recomendado) {
    highlights.push(`a ${leg.minutos}′ ${MODE_LABEL[c.recomendado]} del trabajo`);
  }

  // Precio frente a la zona.
  const val = e.valuation;
  if (val?.banda && !val.fromFallback && val.nivel === "modelo") {
    if (val.banda === "barato" || val.banda === "ajustado") {
      highlights.push(`precio por debajo del escenario indexado (${formatDiff(val.diferenciaPorcentual)})`);
    } else if (val.banda === "en_linea") {
      highlights.push("precio cercano al escenario indexado");
    }
  }

  if (profile?.presupuestoMax && p.price <= profile.presupuestoMax) {
    highlights.push("dentro de tu presupuesto");
  }

  const all = dedupe(highlights);
  const top = all.slice(0, 3);
  let rationale: string;
  if (top.length === 0) {
    rationale = "Encaja con lo que buscas.";
  } else if (top.length === 1) {
    rationale = `${capitalize(top[0])}.`;
  } else {
    const last = top[top.length - 1];
    const head = top.slice(0, -1).join(", ");
    rationale = `${capitalize(head)} y ${last}.`;
  }

  return { highlights: all, rationale };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs));
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
