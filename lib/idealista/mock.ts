/**
 * Datos sintéticos para `MOCK_IDEALISTA=true`. Siempre realistas:
 * precios y m² coherentes, fotos vía picsum.photos con seed determinístico
 * por propertyCode (no rotan entre renders).
 */
import type { Property, PropertyDetail, SearchFilters } from "@/types";

const SEEDS = [
  { zona: "Chamberí", municipio: "Madrid", lat: 40.4319, lon: -3.7036 },
  { zona: "Malasaña", municipio: "Madrid", lat: 40.4258, lon: -3.7036 },
  { zona: "Salamanca", municipio: "Madrid", lat: 40.4279, lon: -3.6826 },
  { zona: "Lavapiés", municipio: "Madrid", lat: 40.4097, lon: -3.7028 },
  { zona: "Eixample", municipio: "Barcelona", lat: 41.3927, lon: 2.1649 },
  { zona: "Gràcia", municipio: "Barcelona", lat: 41.4034, lon: 2.1576 },
  { zona: "Ruzafa", municipio: "Valencia", lat: 39.4592, lon: -0.3736 },
  { zona: "Triana", municipio: "Sevilla", lat: 37.3849, lon: -6.0048 },
];

const STREET_PREFIXES = [
  "Calle de",
  "Calle de",
  "Travesía de",
  "Plaza de",
  "Avenida de",
];

const STREET_NAMES = [
  "Fuencarral",
  "Almagro",
  "Alburquerque",
  "Sagasta",
  "Goya",
  "Velázquez",
  "Príncipe de Vergara",
  "Trafalgar",
  "Hortaleza",
  "Ponzano",
  "Bailén",
  "San Bernardo",
];

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
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${code}-${i}/1280/860`);
}

function makeOne(filters: SearchFilters, idx: number): Property {
  const code = `mock-${(filters.zona ?? "es").toLowerCase().replace(/\s+/g, "-")}-${idx}`;
  const rng = pseudoRandom(code);

  const matched = SEEDS.find((s) =>
    filters.zona.toLowerCase().includes(s.zona.toLowerCase()) ||
    filters.zona.toLowerCase().includes(s.municipio.toLowerCase())
  );
  const seed = matched ?? pickIndex(SEEDS, rng);

  const isRent = filters.operacion === "alquiler";
  const baseSqm = 55 + Math.floor(rng() * 90);
  const eurPerSqm = isRent
    ? 14 + rng() * 18 // 14–32 €/m² mes
    : 3200 + rng() * 4500; // 3200–7700 €/m² compra

  let price = Math.round((baseSqm * eurPerSqm) / 50) * 50;
  if (filters.precioMax) price = Math.min(price, filters.precioMax);
  if (filters.precioMin) price = Math.max(price, filters.precioMin);

  const rooms = Math.max(filters.habitaciones ?? 1, Math.ceil(baseSqm / 38));
  const street = `${pickIndex(STREET_PREFIXES, rng)} ${pickIndex(STREET_NAMES, rng)}, ${Math.ceil(rng() * 180)}`;
  const floor = `${Math.ceil(rng() * 6)}º ${rng() > 0.5 ? "izq." : "dcha."}`;

  return {
    propertyCode: code,
    title: `${filters.tipo === "casas" ? "Casa" : "Piso"} de ${rooms} hab. en ${seed.zona}`,
    price,
    pricePerSqm: Math.round(price / baseSqm),
    size: baseSqm,
    rooms,
    bathrooms: rng() > 0.4 ? 2 : 1,
    address: street,
    district: seed.zona,
    municipality: seed.municipio,
    province: seed.municipio === "Barcelona" ? "Barcelona" : seed.municipio === "Valencia" ? "Valencia" : seed.municipio === "Sevilla" ? "Sevilla" : "Madrid",
    propertyType: filters.tipo ?? "pisos",
    operation: isRent ? "rent" : "sale",
    thumbnail: `https://picsum.photos/seed/${code}-0/800/600`,
    url: `https://www.idealista.com/inmueble/${code}/`,
    hasLift: rng() > 0.3,
    exterior: rng() > 0.35,
    floor,
    latitude: seed.lat + (rng() - 0.5) * 0.01,
    longitude: seed.lon + (rng() - 0.5) * 0.01,
  };
}

export function mockSearch(filters: SearchFilters, max = 6): Property[] {
  return Array.from({ length: max }, (_, i) => makeOne(filters, i));
}

export function mockDetail(propertyCode: string): PropertyDetail {
  const rng = pseudoRandom(propertyCode);
  const base = makeOne(
    { zona: "Madrid", operacion: "venta", tipo: "pisos" },
    0
  );
  const features: string[] = [];
  if (base.hasLift) features.push("Ascensor");
  if (base.exterior) features.push("Exterior");
  features.push(rng() > 0.5 ? "Terraza" : "Balcón");
  if (rng() > 0.5) features.push("Calefacción individual");
  if (rng() > 0.4) features.push("Aire acondicionado");
  if (rng() > 0.6) features.push("Trastero");
  if (rng() > 0.7) features.push("Plaza de garaje");

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
