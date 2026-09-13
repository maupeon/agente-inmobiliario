/**
 * Datos sintéticos para `MOCK_IDEALISTA=true`. Los nombres territoriales son
 * reales; viviendas, direcciones, precios y características son ficticios.
 * Se muestran con una ilustración local y sin enlace a un anuncio real.
 * Los importes solo construyen ejemplos variados, no referencias de mercado.
 */
import type { Property, PropertyDetail, SearchFilters } from "@/types";

interface Seed {
  zona: string;
  municipio: string;
  provincia: string;
  lat: number;
  lon: number;
  /** €/m²/mes de referencia (alquiler). */
  alquilerM2: number;
  /** €/m² de referencia (compra). */
  ventaM2: number;
}

const SEEDS: Seed[] = [
  // ── Madrid ──
  { zona: "Salamanca", municipio: "Madrid", provincia: "Madrid", lat: 40.4279, lon: -3.6826, alquilerM2: 21.5, ventaM2: 6500 },
  { zona: "Chamberí", municipio: "Madrid", provincia: "Madrid", lat: 40.4319, lon: -3.7036, alquilerM2: 20.0, ventaM2: 5600 },
  { zona: "Retiro", municipio: "Madrid", provincia: "Madrid", lat: 40.4150, lon: -3.6770, alquilerM2: 19.0, ventaM2: 5700 },
  { zona: "Chamartín", municipio: "Madrid", provincia: "Madrid", lat: 40.4600, lon: -3.6770, alquilerM2: 18.5, ventaM2: 5300 },
  { zona: "Malasaña", municipio: "Madrid", provincia: "Madrid", lat: 40.4258, lon: -3.7036, alquilerM2: 20.5, ventaM2: 5200 },
  { zona: "Centro", municipio: "Madrid", provincia: "Madrid", lat: 40.4156, lon: -3.7038, alquilerM2: 21.0, ventaM2: 5400 },
  { zona: "Lavapiés", municipio: "Madrid", provincia: "Madrid", lat: 40.4090, lon: -3.7006, alquilerM2: 18.0, ventaM2: 3900 },
  { zona: "Tetuán", municipio: "Madrid", provincia: "Madrid", lat: 40.4600, lon: -3.6990, alquilerM2: 17.0, ventaM2: 3900 },
  { zona: "Arganzuela", municipio: "Madrid", provincia: "Madrid", lat: 40.3960, lon: -3.6960, alquilerM2: 18.0, ventaM2: 4500 },
  { zona: "Carabanchel", municipio: "Madrid", provincia: "Madrid", lat: 40.3840, lon: -3.7280, alquilerM2: 14.5, ventaM2: 3000 },
  { zona: "Vallecas", municipio: "Madrid", provincia: "Madrid", lat: 40.3920, lon: -3.6660, alquilerM2: 13.5, ventaM2: 2700 },

];

const STREET_PREFIXES = ["Calle de", "Calle de", "Travesía de", "Plaza de", "Avenida de"];
const STREET_NAMES = [
  "Fuencarral", "Almagro", "Alburquerque", "Sagasta", "Goya", "Velázquez",
  "Príncipe de Vergara", "Trafalgar", "Hortaleza", "Ponzano", "Bailén", "San Bernardo",
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function slug(s: string): string {
  return norm(s).replace(/\s+/g, "-");
}
function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function pseudoRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickIndex<T>(arr: readonly T[], rng: () => number) {
  return arr[Math.floor(rng() * arr.length)];
}

function makePhotos(code: string, count: number) {
  void code;
  return count > 0 ? ["/property-demo.svg"] : [];
}

/**
 * Elige los barrios para la búsqueda: si la zona nombra un barrio, se concentra
 * ahí; si nombra una ciudad, reparte por todos sus barrios; si no, Madrid.
 */
function seedsForQuery(zona: string): Seed[] {
  const q = norm(zona);
  if (q) {
    const barrio = SEEDS.filter((s) => q.includes(norm(s.zona)));
    if (barrio.length) return barrio;
    const ciudad = SEEDS.filter((s) => q.includes(norm(s.municipio)) || q.includes(norm(s.provincia)));
    if (ciudad.length) return ciudad;
  }
  return SEEDS.filter((s) => s.municipio === "Madrid");
}

function makeFeatures(rng: () => number, hasLift: boolean, exterior: boolean): string[] {
  const f: string[] = [];
  if (hasLift) f.push("Ascensor");
  if (exterior) f.push("Exterior");
  if (rng() > 0.5) f.push(rng() > 0.5 ? "Terraza" : "Balcón");
  if (rng() > 0.5) f.push("Aire acondicionado");
  if (rng() > 0.55) f.push("Calefacción");
  if (rng() > 0.6) f.push("Amueblado");
  if (rng() > 0.7) f.push("Garaje");
  if (rng() > 0.7) f.push("Trastero");
  return f;
}

function makeOne(filters: SearchFilters, idx: number, seed: Seed): Property {
  const code = `mock-${slug(seed.zona)}-${idx}`;
  const rng = pseudoRandom(code);
  const isRent = filters.operacion === "alquiler";

  let size = 45 + Math.floor(rng() * 95); // 45-139 m²
  if (filters.metrosMin) size = Math.max(size, filters.metrosMin);

  // €/m² del barrio con variación (±~20%): unos pisos por encima, otros por debajo.
  const eurM2 = (isRent ? seed.alquilerM2 : seed.ventaM2) * (0.82 + rng() * 0.4);
  const step = isRent ? 10 : 1000;
  let price = roundTo(size * eurM2, step);

  // Respeta el presupuesto sin aplanar todo al mismo número: si se pasa,
  // ajusta el tamaño para caer en el 72-100% del máximo.
  if (filters.precioMax && price > filters.precioMax) {
    const target = filters.precioMax * (0.72 + rng() * 0.28);
    size = Math.max(filters.metrosMin ?? 35, Math.round(target / eurM2));
    price = roundTo(size * eurM2, step);
  }
  if (filters.precioMin && price < filters.precioMin) {
    price = roundTo(filters.precioMin * (1 + rng() * 0.15), step);
    size = Math.max(filters.metrosMin ?? 35, Math.round(price / eurM2));
  }

  const rooms = Math.max(filters.habitaciones ?? 1, Math.min(5, Math.ceil(size / 34)));
  const hasLift = rng() > 0.3;
  const exterior = rng() > 0.35;
  const street = `${pickIndex(STREET_PREFIXES, rng)} ${pickIndex(STREET_NAMES, rng)}, ${Math.ceil(rng() * 180)}`;
  const floor = String(Math.ceil(rng() * 7));

  return {
    propertyCode: code,
    title: `${filters.tipo === "casas" ? "Casa" : "Piso"} de ${rooms} hab. en ${seed.zona}`,
    price,
    pricePerSqm: Math.round(price / size),
    size,
    rooms,
    bathrooms: rng() > 0.45 ? 2 : 1,
    address: street,
    district: seed.zona,
    municipality: seed.municipio,
    province: seed.provincia,
    propertyType: filters.tipo === "casas" ? "chalet" : "flat",
    detailedType: { typology: filters.tipo === "casas" ? "chalet" : "flat", subTypology: "flat" },
    sourceKind: "demo",
    operation: isRent ? "rent" : "sale",
    thumbnail: "/property-demo.svg",
    url: "",
    features: makeFeatures(rng, hasLift, exterior),
    hasLift,
    exterior,
    floor,
    latitude: seed.lat + (rng() - 0.5) * 0.008,
    longitude: seed.lon + (rng() - 0.5) * 0.008,
  };
}

export function mockSearch(filters: SearchFilters, max = 6): Property[] {
  const pool = seedsForQuery(filters.zona ?? "");
  return Array.from({ length: max }, (_, i) => makeOne(filters, i, pool[i % pool.length]));
}

export function mockDetail(propertyCode: string): PropertyDetail {
  const rng = pseudoRandom(propertyCode);
  const slugPart = propertyCode.replace(/^mock-/, "").replace(/-\d+$/, "");
  const seed = SEEDS.find((s) => slug(s.zona) === slugPart) ?? SEEDS[0];
  const base = makeOne(
    { zona: seed.zona, operacion: rng() > 0.5 ? "venta" : "alquiler", tipo: "pisos" },
    0,
    seed
  );

  const features = base.features ? [...base.features] : [];
  if (!features.includes("Calefacción") && rng() > 0.5) features.push("Calefacción individual");

  return {
    ...base,
    propertyCode,
    description:
      "Vivienda completamente reformada con materiales de alta calidad. " +
      "Distribución pasante, salón con cocina abierta, dormitorio principal " +
      "con baño en suite y un segundo dormitorio amplio. Edificio rehabilitado " +
      "con ascensor. A dos minutos del metro y de los principales servicios.",
    photos: makePhotos(propertyCode, 5),
    features,
    energyCertification: ["B", "C", "D", "E"][Math.floor(rng() * 4)],
    yearBuilt: 1920 + Math.floor(rng() * 100),
  };
}
