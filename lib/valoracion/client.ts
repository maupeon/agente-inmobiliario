import "server-only";
import type { Property } from "@/types";
import type {
  AnuncioParaValorar,
  RespuestaValoracion,
  ValoracionModelo,
} from "./types";

/**
 * Cliente del servicio de valoración entrenado en el TFM.
 *
 * El modelo vive en un servicio Python aparte (LightGBM no corre en el runtime
 * de Vercel). Todo aquí está pensado para que la app siga funcionando si el
 * servicio no responde: se devuelve `null` y quien llama cae a la heurística
 * anterior. Nunca se lanza una excepción hacia arriba.
 */

const URL_BASE = process.env.VALORACION_URL;
const TOKEN = process.env.VALORACION_TOKEN;
// 10 s por defecto: con auto-stop en Fly, la primera petición tras un rato de
// inactividad tiene que esperar a que arranque la máquina (~3-5 s).
const TIMEOUT_MS = Number(process.env.VALORACION_TIMEOUT_MS ?? 10000);
/** El servicio solo sabe de Madrid capital: fuera de ahí no se le pregunta. */
const MUNICIPIO = /madrid/i;

export function valoracionDisponible(): boolean {
  return Boolean(URL_BASE);
}

/** Solo tiene sentido para compra en Madrid capital y con coordenadas. */
export function esValorable(p: Property): boolean {
  return (
    p.operation === "sale" &&
    p.latitude != null &&
    p.longitude != null &&
    p.size > 0 &&
    MUNICIPIO.test(p.municipality ?? p.province ?? "")
  );
}

function aAnuncio(p: Property): AnuncioParaValorar {
  return {
    propertyCode: p.propertyCode,
    price: p.price,
    size: p.size,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    floor: p.floor,
    hasLift: p.hasLift,
    exterior: p.exterior,
    latitude: p.latitude!,
    longitude: p.longitude!,
    propertyType: p.propertyType,
  };
}

/**
 * Valora un lote de propiedades. Devuelve un mapa por `propertyCode`; las que
 * no se pudieron valorar simplemente no aparecen.
 */
export async function valorarLote(
  properties: Property[]
): Promise<Map<string, ValoracionModelo>> {
  const vacio = new Map<string, ValoracionModelo>();
  if (!URL_BASE) return vacio;

  const valorables = properties.filter(esValorable);
  if (valorables.length === 0) return vacio;

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${URL_BASE.replace(/\/$/, "")}/valorar`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify({ anuncios: valorables.map(aAnuncio), renivelar: true }),
      signal: control.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[valoracion] servicio ${res.status}; se usa la heurística`);
      return vacio;
    }
    const json = (await res.json()) as RespuestaValoracion;
    return new Map(
      json.resultados
        .filter((r): r is ValoracionModelo & { propertyCode: string } =>
          Boolean(r.propertyCode)
        )
        .map((r) => [r.propertyCode, r])
    );
  } catch (err) {
    const motivo = err instanceof Error && err.name === "AbortError" ? "timeout" : err;
    console.warn("[valoracion] no disponible, se usa la heurística:", motivo);
    return vacio;
  } finally {
    clearTimeout(reloj);
  }
}

/** Comprobación de vida del servicio, para el panel de estado. */
export async function saludValoracion(): Promise<Record<string, unknown> | null> {
  if (!URL_BASE) return null;
  try {
    const res = await fetch(`${URL_BASE.replace(/\/$/, "")}/salud`, {
      cache: "no-store",
      // Mismo margen que las valoraciones: con auto-stop en Fly la máquina puede
      // estar dormida y 2,5 s no bastan para el arranque en frío.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
