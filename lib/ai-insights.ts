import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { MODE_LABEL } from "@/lib/dashboard-format";
import type { PropertyRecommendation, UserProfile } from "@/types";

/**
 * Narración "agéntica" de las recomendaciones: una sola llamada a Claude que
 * redacta un intro "para ti" y una frase de por qué encaja cada piso. Si no hay
 * clave, falla o tarda demasiado, devuelve null y el recomendador conserva la
 * explicación determinista. No inventa datos: solo reescribe los que le pasamos.
 */
// Para la narración usamos un modelo rápido (la calidad del texto corto es
// sobrada y el panel carga en ~3s en vez de ~12s con Opus). Override por env.
const MODEL = process.env.INSIGHTS_MODEL ?? "claude-sonnet-4-6";
const TIMEOUT_MS = 15_000;

export interface Narration {
  intro: string | null;
  byCode: Record<string, string>;
}

export async function narrateRecommendations(
  profile: UserProfile | null,
  items: PropertyRecommendation[]
): Promise<Narration | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (process.env.LLM_ENABLED === "false" || process.env.LLM_INSIGHTS_ENABLED !== "true" || !apiKey || items.length === 0) return null;

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: TIMEOUT_MS });
  const system =
    "Eres un asesor inmobiliario español, cercano y honesto (tuteo, español de España). " +
    "Te paso el perfil de una persona y una lista de pisos YA analizados. " +
    'Devuelve SOLO un JSON válido con esta forma exacta: {"intro": string, "items": [{"code": string, "why": string}]}. ' +
    "'intro': 1-2 frases dirigidas a la persona resumiendo qué has priorizado al elegir. " +
    "'why' por piso: UNA frase natural y concreta de por qué le encaja. " +
    "Usa SOLO los datos que te doy (no inventes precios, tiempos, barrios ni servicios). " +
    "No uses markdown ni texto fuera del JSON.";

  const payload = {
    perfil: profileSummary(profile),
    pisos: items.map(compact),
  };

  try {
    const res = await withTimeout(
      client.messages.create({
        model: MODEL,
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
      TIMEOUT_MS
    );
    const text = res.content
      .filter((b): b is TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return parse(text);
  } catch (err) {
    console.warn("[ai-insights] narración no disponible:", err instanceof Error ? err.message : err);
    return null;
  }
}

function compact(it: PropertyRecommendation) {
  const c = it.enrichment.commute;
  const leg = c?.modos.find((m) => m.modo === c.recomendado);
  const v = it.enrichment.valuation;
  return {
    code: it.property.propertyCode,
    titulo: it.property.title,
    barrio: it.property.district ?? null,
    ciudad: it.property.municipality ?? null,
    operacion: it.property.operation === "rent" ? "alquiler" : "compra",
    precio: it.property.price,
    habitaciones: it.property.rooms,
    m2: it.property.size,
    difPrecioPct: v?.diferenciaPorcentual ?? null,
    valoracionPrecio: v?.etiqueta ?? null,
    seguridad0a100: it.enrichment.neighborhood?.seguridad.indice ?? null,
    trayectoMin: leg?.minutos ?? null,
    modoTrayecto: c?.recomendado ? MODE_LABEL[c.recomendado] : null,
    destacados: it.highlights,
  };
}

function profileSummary(p: UserProfile | null) {
  if (!p) return null;
  return {
    nombre: p.name ?? null,
    operacion: p.operacion,
    tipo: p.tipo ?? null,
    zona: p.zona ?? null,
    presupuestoMax: p.presupuestoMax ?? null,
    habitaciones: p.habitaciones ?? null,
    hogar: p.hogar ?? null,
    mascota: p.mascota ?? null,
    imprescindibles: p.imprescindibles ?? [],
    prioridades: p.prioridades ?? [],
  };
}

function parse(text: string): Narration | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const json = JSON.parse(cleaned) as {
      intro?: unknown;
      items?: Array<{ code?: unknown; why?: unknown }>;
    };
    const byCode: Record<string, string> = {};
    for (const it of json.items ?? []) {
      if (typeof it.code === "string" && typeof it.why === "string") {
        byCode[it.code] = it.why.trim();
      }
    }
    const intro = typeof json.intro === "string" ? json.intro.trim() : null;
    if (!intro && Object.keys(byCode).length === 0) return null;
    return { intro, byCode };
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
    ),
  ]);
}
