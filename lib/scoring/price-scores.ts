import type { FairScoring, OpportunityScoring, Property, PropertyEnrichment } from "@/types";
import { isMadridProperty } from "@/lib/search-scope";
import { OPPORTUNITY_DISTRICTS, OPPORTUNITY_SOURCE } from "./opportunity-data";
import { isCurrentValuation } from "@/lib/valoracion/current-model";

const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const clamp = (n: number) => Math.min(100, Math.max(0, n));
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[\s-]+/g, " ");

/** Regla provisional: ±20% frente a la estimación abarca la escala completa. */
export function fairFromGap(gapPercent: number | null): number | null {
  return finite(gapPercent) ? clamp(50 - 2.5 * gapPercent) : null;
}

/** El cálculo usa importes de la misma operación, no bandas ni medias territoriales. */
export function fairForProperty(p: Property, e: PropertyEnrichment): FairScoring | null {
  const v = e.valuation;
  if (e.propertyCode !== p.propertyCode || !v || v.nivel !== "modelo" || v.estadoModelo !== "ok"
    || v.fromFallback || !isCurrentValuation(v) || !positive(p.price) || !positive(v.precioEstimado)
    || !["sale", "rent"].includes(p.operation)
    || v.operacion !== (p.operation === "rent" ? "alquiler" : "venta")) return null;
  const gapPercent = (p.price / v.precioEstimado - 1) * 100;
  const score = fairFromGap(gapPercent);
  return score == null ? null : { method: "fair-linear-v1", score, gapPercent,
    advertisedPrice: p.price, estimatedPrice: v.precioEstimado,
    unit: p.operation === "rent" ? "€/mes" : "€", period: v.nivelPrecios ?? v.periodo ?? "sin periodo",
    modelVersion: v.modeloVersion };
}

/** Diferencia de tasas en puntos porcentuales; funciona también con crecimientos negativos o cero. */
export function opportunityFromGrowth(district: number | null, city: number | null): number | null {
  if (!finite(district) || !finite(city) || district <= -100 || city <= -100) return null;
  return clamp(50 + 2.5 * (district - city));
}

/** Misma evolución territorial de venta para compra y alquiler; distrito explícito. */
export function opportunityForProperty(p: Property): OpportunityScoring | null {
  if (!["sale", "rent"].includes(p.operation) || !isMadridProperty(p) || !p.district) return null;
  const name = normalize(p.district);
  const district = OPPORTUNITY_DISTRICTS.find(d => [d.code, d.district, d.sourceName].some(s => normalize(s) === name));
  if (!district) return null;
  const score = opportunityFromGrowth(district.growthPercent, OPPORTUNITY_SOURCE.cityGrowthPercent);
  return score == null ? null : { method: "opportunity-linear-v1", score, scope: "distrito",
    district: district.district, districtCode: district.code,
    districtGrowthPercent: district.growthPercent, cityGrowthPercent: OPPORTUNITY_SOURCE.cityGrowthPercent,
    gapPercentagePoints: district.growthPercent - OPPORTUNITY_SOURCE.cityGrowthPercent,
    source: OPPORTUNITY_SOURCE.source, sourceUrl: OPPORTUNITY_SOURCE.url,
    period: OPPORTUNITY_SOURCE.period, retrievedAt: OPPORTUNITY_SOURCE.retrievedAt };
}
