import type { Imprescindible, PersonalScoring, Property, PropertyEnrichment, ScoreComponent, ScoreWeights, UserProfile } from "@/types";
import { zoneForProperty } from "@/lib/neighborhood/zone-score";

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { alpha: 25, beta: 25, gamma: 25, delta: 25 };
export const SCORE_LABELS = { alpha: "α Fair · precio", beta: "β Opportunity · inversión", gamma: "γ Zone · calidad de vida", delta: "δ Lifestyle · tiempo al trabajo" } as const;
export function validScoreWeights(value: unknown): value is ScoreWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const w = value as ScoreWeights;
  return [w.alpha, w.beta, w.gamma, w.delta].every((n) => Number.isInteger(n) && n >= 0 && n <= 100)
    && w.alpha + w.beta + w.gamma + w.delta === 100;
}
export function scoreWeights(value?: unknown): ScoreWeights {
  return validScoreWeights(value) ? { ...value } : { ...DEFAULT_SCORE_WEIGHTS };
}
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

/** Fórmula reproducible de preferencia, no probabilidad, tasación ni calidad del barrio. */
export function personalScore(p: Property, e: PropertyEnrichment, profile: UserProfile | null): { score: number; scoring: PersonalScoring } {
  const weights = scoreWeights(profile?.scoreWeights);
  const model = usableModel(e);
  const v = e.valuation;
  const fairValues = { barato: 100, ajustado: 85, en_linea: 62, caro: 32, muy_caro: 12 };
  const fair = model && v?.banda ? fairValues[v.banda] : null;
  // Opportunity sigue necesitando series comparables de zona y ciudad.
  const opportunity: number | null = null;
  const zoneScoring = zoneForProperty(p);
  const zone = zoneScoring?.score ?? null;
  const leg = e.commute?.modos.find((m) => m.modo === e.commute?.recomendado);
  const minutes = profile?.trabajo && leg?.minutos != null && Number.isFinite(leg.minutos) && leg.minutos >= 0 ? leg.minutos : null;
  const lifestyle = minutes == null ? null : minutes <= 10 ? 100 : minutes >= 60 ? 5 : 100 - (minutes - 10) * 1.9;
  const component = (key: ScoreComponent["key"], label: string, weight: number, value: number | null, explanation: string): ScoreComponent => {
    const shownValue = value == null ? null : round(value);
    return { key, label, weight, value: shownValue, contribution: shownValue == null ? 0 : round(weight * shownValue / 100), explanation };
  };
  const components = [
    component("fair", "Fair · precio", weights.alpha, fair, fair == null
      ? v?.modeloId === "habitIA-xgboost-2018-v3" && model
        ? "El modelo XGBoost ofrece una estimación puntual sin bandas calibradas. Fair no aporta puntos; consulta el precio y la desviación en la ficha."
        : "Sin estimación individual válida. Una media territorial no sustituye al modelo."
      : "Preferencia por menor precio frente al escenario indexado: bandas 100/85/62/32/12. Oferta de 2018; precisión actual no validada."),
    component("opportunity", "Opportunity · inversión", weights.beta, opportunity, "Compara la revalorización de la zona con la media de la ciudad en el mismo periodo. Sin series comparables verificadas: no disponible. No se sustituye por el margen del precio frente al modelo."),
    { ...component("zone", "Zone · entorno", weights.gamma, zone, zoneScoring
      ? `Distrito ${zoneScoring.district}: ${zoneScoring.available}/5 indicadores. Zone = 100 × suma de cinco índices / 5. Más m² verdes, líneas y servicios suman; menos actuaciones y ruido suman. Los indicadores ausentes no aportan puntos ni se redistribuye su peso. Recuentos absolutos de distintos periodos; menos actuaciones no acredita mayor seguridad.`
      : "Sin distrito de Madrid identificado en el anuncio. No se asignan indicadores por cercanía ni a partir de la zona del perfil."), coveragePercent: zoneScoring?.coveragePercent ?? 0 },
    component("lifestyle", "Lifestyle · tiempo al trabajo", weights.delta, lifestyle, minutes == null ? "Configura tu trabajo y un modo de transporte para calcular el trayecto. Sin tiempo disponible, no aporta puntos." : `Trayecto ${e.commute?.proveedor === "openrouteservice" ? "calculado" : "orientativo"} de ${minutes} min. 100 puntos hasta 10 min; baja 1,9 puntos por minuto hasta 5 puntos a partir de 60 min. Presupuesto e imprescindibles se aplican como filtros, no como este subscore.`),
  ];
  return {
    score: Math.round(components.reduce((sum, c) => sum + c.weight * (c.value ?? 0) / 100, 0)),
    scoring: { weights, components, zone: zoneScoring, coveragePercent: round(components.reduce((sum, c) => sum + c.weight * (c.value == null ? 0 : c.coveragePercent ?? 100) / 100, 0)), explanation: "HabitIA Score = α×Fair + β×Opportunity + γ×Zone + δ×Lifestyle, dividido entre 100 y redondeado al entero. Con datos incompletos es una suma parcial de puntos, no una evaluación global. Los datos ausentes no aportan puntos y sus pesos no se redistribuyen; la cobertura incluye la fracción disponible de Zone." },
  };
}
