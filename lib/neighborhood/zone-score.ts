import type { Property, ZoneIndicator, ZoneScoring } from "@/types";
import { isMadridProperty } from "@/lib/search-scope";
import { ZONE_DISTRICTS, ZONE_SOURCES } from "./zone-data";

type Key = ZoneIndicator["key"];
export interface ZoneObservation {
  code: string;
  district: string;
  green: number | null;
  actions: number | null;
  transport: number | null;
  services: number | null;
  noise: number | null;
}

const INDICATORS: { key: Key; label: string; unit: string; inverse: boolean }[] = [
  { key: "green", label: "Zonas verdes", unit: "m²", inverse: false },
  { key: "actions", label: "Actuaciones policiales", unit: "actuaciones", inverse: true },
  { key: "transport", label: "Transporte", unit: "líneas distintas de Metro", inverse: false },
  { key: "services", label: "Servicios", unit: "locales únicos", inverse: false },
  { key: "noise", label: "Descanso", unit: "dB nocturnos", inverse: true },
];
const observed = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[\s-]+/g, " ");

/** Rango medio de empates: (rango - 1) / (n - 1). No acepta ausencias ni una sola observación. */
export function percentileRank(value: number | null, reference: (number | null)[]): number | null {
  if (!observed(value) || reference.length < 2 || !reference.every(observed)) return null;
  const less = reference.filter(n => n! < value).length;
  const equal = reference.filter(n => n === value).length;
  return equal ? (less + (equal - 1) / 2) / (reference.length - 1) : null;
}

/** Mantiene los cinco pesos del 20%; no renormaliza al faltar un indicador. */
export function calculateZone(code: string, districts: readonly ZoneObservation[] = ZONE_DISTRICTS): ZoneScoring | null {
  if (new Set(districts.map(d => d.code)).size !== districts.length) return null;
  const district = districts.find(d => d.code === code);
  if (!district) return null;
  const indicators = INDICATORS.map(({ key, label, unit, inverse }): ZoneIndicator => {
    const rawValue = observed(district[key]) ? district[key] : null;
    const rank = percentileRank(rawValue, districts.map(d => d[key]));
    const index = rank == null ? null : inverse ? 1 - rank : rank;
    return { key, label, unit, rawValue, index, points: index == null ? null : 20 * index, inverse,
      source: ZONE_SOURCES[key].source, sourceUrl: ZONE_SOURCES[key].url, period: ZONE_SOURCES[key].period };
  });
  const available = indicators.filter(i => i.index != null).length;
  return { method: "zone-percentiles-v1", district: district.district, districtCode: code, scope: "distrito",
    indicators, available, coveragePercent: available * 20,
    score: available ? indicators.reduce((sum, i) => sum + (i.points ?? 0), 0) : null };
}

/** Solo nombres/códigos explícitos del distrito; no atribuye datos por cercanía ni por el perfil. */
export function zoneForProperty(property: Property): ZoneScoring | null {
  if (!isMadridProperty(property) || !property.district) return null;
  const name = normalize(property.district);
  const district = ZONE_DISTRICTS.find(d => normalize(d.district) === name || d.code === name);
  return district ? calculateZone(district.code) : null;
}
