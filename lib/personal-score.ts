import type { Imprescindible, PersonalScoring, Property, PropertyEnrichment, ScoreComponent, ScoreWeights, UserProfile } from "@/types";

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { alpha: 25, beta: 25, gamma: 25, delta: 25 };
export const SCORE_LABELS = { alpha: "α Fair · precio", beta: "β Opportunity · margen", gamma: "γ Zone · ubicación", delta: "δ Lifestyle · tu día a día" } as const;
export function validScoreWeights(value: unknown): value is ScoreWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const w = value as ScoreWeights;
  return [w.alpha, w.beta, w.gamma, w.delta].every((n) => Number.isInteger(n) && n >= 0 && n <= 100)
    && w.alpha + w.beta + w.gamma + w.delta === 100;
}
export function scoreWeights(value?: unknown): ScoreWeights {
  return validScoreWeights(value) ? { ...value } : { ...DEFAULT_SCORE_WEIGHTS };
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const round = (n: number) => Math.round(n * 10) / 10;

/** El contrato de estimación exige éxito explícito, versión y ausencia de respaldo. */
export function usableModel(e: PropertyEnrichment): boolean {
  const v = e.valuation;
  return !!v && v.nivel === "modelo" && v.estadoModelo === "ok" && !v.fromFallback
    && Number.isFinite(v.diferenciaPorcentual) && !!v.modeloVersion;
}

/** Indicios explícitos del anuncio; la ausencia de una característica no significa que no exista. */
export function satisfiesMust(p: Property, m: Imprescindible): boolean | null {
  if (m === "ascensor") return p.hasLift ?? null;
  if (m === "exterior") return p.exterior ?? null;
  const patterns: Record<Exclude<Imprescindible, "ascensor" | "exterior">, RegExp> = {
    terraza: /terraza|balc[oó]n/, aire_acondicionado: /aire acondicionado/,
    amueblado: /amueblad/, garaje: /garaje|parking|plaza de aparcamiento/, trastero: /trastero/,
  };
  const matched = (p.features ?? []).map((s) => s.toLowerCase()).filter((s) => patterns[m].test(s));
  if (!matched.length) return null;
  if (matched.some((s) => /\b(sin|no tiene|no dispone|no amueblad)/.test(s))) return false;
  return true;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

/** Fórmula reproducible de preferencia, no probabilidad, tasación ni calidad del barrio. */
export function personalScore(p: Property, e: PropertyEnrichment, profile: UserProfile | null, budget = profile?.presupuestoMax): { score: number; scoring: PersonalScoring } {
  const weights = scoreWeights(profile?.scoreWeights);
  const model = usableModel(e);
  const v = e.valuation;
  const fairValues = { barato: 100, ajustado: 85, en_linea: 62, caro: 32, muy_caro: 12 };
  const fair = model && v?.banda ? fairValues[v.banda] : null;
  const interval = model && v?.intervalo && v.intervalo.every(Number.isFinite) && v.intervalo[0] > 0 && v.intervalo[1] >= v.intervalo[0] ? v.intervalo : null;
  const opportunity = interval ? clamp(50 + 200 * (interval[0] - p.price) / interval[0]) : null;
  const coords = [profile?.zonaLat, profile?.zonaLon, p.latitude, p.longitude];
  const distance = coords.every((n) => typeof n === "number" && Number.isFinite(n))
    ? distanceKm(profile!.zonaLat!, profile!.zonaLon!, p.latitude!, p.longitude!) : null;
  const zone = distance == null ? null : clamp(100 * (1 - distance / 3.5));

  const lifestyleSignals: number[] = [];
  const lifestyleReasons: string[] = [];
  if (budget && budget > 0) {
    lifestyleSignals.push(p.price > budget ? 0 : 70 + 30 * (1 - p.price / budget));
    lifestyleReasons.push(p.price <= budget ? "dentro del presupuesto" : "supera el presupuesto");
  }
  const leg = e.commute?.modos.find((m) => m.modo === e.commute?.recomendado);
  if (profile?.trabajo && leg?.minutos != null && Number.isFinite(leg.minutos)) {
    lifestyleSignals.push(leg.minutos <= 10 ? 100 : leg.minutos >= 60 ? 5 : 100 - (leg.minutos - 10) * 1.9);
    lifestyleReasons.push(`trayecto orientativo de ${leg.minutos} min`);
  }
  const musts = profile?.imprescindibles ?? [];
  const assessed = musts.map((m) => satisfiesMust(p, m)).filter((n): n is boolean => n !== null);
  if (assessed.length) {
    lifestyleSignals.push(100 * assessed.filter(Boolean).length / assessed.length);
    lifestyleReasons.push(`${assessed.length}/${musts.length} imprescindibles comprobados`);
  }
  if (musts.length > assessed.length) lifestyleReasons.push(`${musts.length - assessed.length} imprescindibles sin dato`);
  const lifestyle = lifestyleSignals.length ? lifestyleSignals.reduce((a, b) => a + b, 0) / lifestyleSignals.length : null;
  const component = (key: ScoreComponent["key"], label: string, weight: number, value: number | null, explanation: string): ScoreComponent => {
    const shownValue = value == null ? null : round(value);
    return { key, label, weight, value: shownValue, contribution: shownValue == null ? 0 : round(weight * shownValue / 100), explanation };
  };
  const components = [
    component("fair", "Fair · precio", weights.alpha, fair, fair == null ? "Sin estimación individual válida. Una media territorial no sustituye al modelo." : "Preferencia por menor precio frente al escenario indexado: bandas 100/85/62/32/12. Oferta de 2018; precisión actual no validada."),
    component("opportunity", "Opportunity · margen", weights.beta, opportunity, opportunity == null ? "Sin intervalo individual válido." : "50 puntos en el límite inferior del intervalo; ±2 puntos por cada 1% de margen bajo/sobre él (0–100). No es probabilidad de ganga."),
    component("zone", "Zone · ubicación", weights.gamma, zone, distance == null ? "Faltan coordenadas de la zona elegida o del anuncio." : `A ${round(distance)} km en línea recta del punto elegido. 100 puntos allí y 0 a partir de 3,5 km. No mide seguridad ni servicios.`),
    component("lifestyle", "Lifestyle · tu día a día", weights.delta, lifestyle, lifestyleReasons.length ? `${lifestyleReasons.join("; ")}. Media de presupuesto, trayecto y requisitos disponibles. El resto de preferencias de barrio no tiene medición.` : "Configura presupuesto, trabajo o imprescindibles comprobables para evaluar el encaje."),
  ];
  return {
    score: Math.round(components.reduce((sum, c) => sum + c.weight * (c.value ?? 0) / 100, 0)),
    scoring: { weights, components, coveragePercent: components.reduce((sum, c) => sum + (c.value == null ? 0 : c.weight), 0), explanation: "Score HabitIA = α×Fair + β×Opportunity + γ×Zone + δ×Lifestyle, dividido entre 100 y redondeado al entero. Los datos ausentes no aportan puntos y sus pesos no se redistribuyen; revisa la cobertura antes de comparar." },
  };
}
