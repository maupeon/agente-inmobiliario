import type { UserProfile, Property } from "@/types";
import { DEFAULT_SCORE_WEIGHTS, validScoreWeights } from "@/lib/personal-score";
import { ValidationError } from "@/lib/errors";
export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
export async function readJson(req: Request, maxBytes = 100_000): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > maxBytes) throw new ValidationError("body too large", "La petición es demasiado grande.");
  const reader = req.body?.getReader();
  if (!reader) throw new ValidationError("empty body");
  let size = 0; let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ValidationError("body too large", "La petición es demasiado grande."); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("invalid json", "No he entendido la petición.");
  }
}
export function requestIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "anon";
}

export function validatedProfile(value: unknown): UserProfile | null {
  if (value == null) return null;
  if (!isRecord(value) || !["venta", "alquiler"].includes(String(value.operacion))) throw new ValidationError("invalid profile");
  const p: UserProfile = { operacion: value.operacion as UserProfile["operacion"], createdAt: new Date().toISOString() };
  for (const key of ["name", "zona"] as const) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || value[key].length > 200)) throw new ValidationError("invalid profile text");
    if (typeof value[key] === "string") p[key] = value[key];
  }
  for (const key of ["presupuestoMax", "habitaciones", "zonaLat", "zonaLon"] as const) {
    if (value[key] !== undefined && !Number.isFinite(value[key])) throw new ValidationError("invalid profile number");
    if (typeof value[key] === "number") p[key] = value[key];
  }
  if (value.scoreWeights !== undefined && !validScoreWeights(value.scoreWeights)) throw new ValidationError("invalid score weights", "Los cuatro pesos deben ser enteros de 0 a 100 y sumar 100.");
  p.scoreWeights = validScoreWeights(value.scoreWeights) ? { ...value.scoreWeights } : { ...DEFAULT_SCORE_WEIGHTS };
  if (["solo", "pareja", "familia", "compartido"].includes(String(value.hogar))) p.hogar = value.hogar as UserProfile["hogar"];
  if (typeof value.mascota === "boolean") p.mascota = value.mascota;
  if (value.tipo === "pisos" || value.tipo === "casas") p.tipo = value.tipo;
  if (Array.isArray(value.prioridades)) p.prioridades = value.prioridades.filter((x) => ["seguridad", "cerca_trabajo", "vida_nocturna", "zonas_verdes", "transporte", "tranquilidad"].includes(x)).slice(0, 6);
  if (Array.isArray(value.imprescindibles)) p.imprescindibles = value.imprescindibles.filter((x) => ["ascensor", "exterior", "terraza", "aire_acondicionado", "amueblado", "garaje", "trastero"].includes(x)).slice(0, 7);
  if (isRecord(value.trabajo)) {
    const t = value.trabajo;
    if (typeof t.direccion !== "string" || t.direccion.length > 300) throw new ValidationError("invalid work address");
    p.trabajo = { direccion: t.direccion };
    if (typeof t.lat === "number" && Number.isFinite(t.lat) && Math.abs(t.lat) <= 90) p.trabajo.lat = t.lat;
    if (typeof t.lon === "number" && Number.isFinite(t.lon) && Math.abs(t.lon) <= 180) p.trabajo.lon = t.lon;
    if (["a_pie", "bici", "coche", "transporte"].includes(String(t.modo))) p.trabajo.modo = t.modo as NonNullable<UserProfile["trabajo"]>["modo"];
  }
  return p;
}
export function validProperty(value: unknown): value is Property {
  return isRecord(value) && typeof value.propertyCode === "string" && value.propertyCode.length <= 80
    && typeof value.propertyType === "string" && ["sale", "rent"].includes(String(value.operation))
    && Number.isFinite(value.size) && Number(value.size) > 0 && Number.isFinite(value.price) && Number(value.price) > 0
    && ["municipality", "province", "district", "address", "floor"].every((k) => value[k] == null || typeof value[k] === "string")
    && ["latitude", "longitude", "rooms", "bathrooms"].every((k) => value[k] == null || Number.isFinite(value[k]));
}
