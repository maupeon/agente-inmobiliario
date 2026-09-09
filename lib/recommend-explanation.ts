import { MODE_LABEL, formatDiff } from "@/lib/dashboard-format";
import { satisfiesMust, usableModel } from "@/lib/personal-score";
import type { Imprescindible, Property, PropertyEnrichment, UserProfile } from "@/types";

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

export function recommendationExplanation(
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
  if (val?.banda && usableModel(e)) {
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
    rationale = "Cumple los filtros de búsqueda; faltan datos para justificar su encaje personal.";
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

function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs));
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
