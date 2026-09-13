import type { GeoPoint } from "./index";

/**
 * Gazetteer mínimo de barrios y ciudades para resolver coordenadas sin red.
 * Cubre las zonas que conoce el mock de Idealista + capitales frecuentes, así
 * el cálculo de trayecto funciona offline en la demo. Si no hay coincidencia,
 * la tool recurre a la geocodificación con Nominatim.
 */
const PLACES: Record<string, GeoPoint> = {
  // Madrid — barrios
  "chamberi madrid": { lat: 40.4319, lon: -3.7036 },
  "malasana madrid": { lat: 40.4258, lon: -3.7036 },
  "salamanca madrid": { lat: 40.4279, lon: -3.6826 },
  "lavapies madrid": { lat: 40.4097, lon: -3.7028 },
  "centro madrid": { lat: 40.4156, lon: -3.7038 },
  "retiro madrid": { lat: 40.4118, lon: -3.6837 },
  "chamartin madrid": { lat: 40.4612, lon: -3.6766 },
  "tetuan madrid": { lat: 40.4596, lon: -3.6987 },
  "arganzuela madrid": { lat: 40.3984, lon: -3.6953 },
  "carabanchel madrid": { lat: 40.3848, lon: -3.7279 },
  "vallecas madrid": { lat: 40.3919, lon: -3.6679 },
  "gran via madrid": { lat: 40.42, lon: -3.7025 },
  // Barcelona — barrios
  "eixample barcelona": { lat: 41.3927, lon: 2.1649 },
  "gracia barcelona": { lat: 41.4034, lon: 2.1576 },
  "ciutat vella barcelona": { lat: 41.3806, lon: 2.1736 },
  "sant marti barcelona": { lat: 41.4096, lon: 2.1996 },
  "sants barcelona": { lat: 41.3754, lon: 2.1335 },
  // Valencia / Sevilla — barrios
  "ruzafa valencia": { lat: 39.4592, lon: -0.3736 },
  "el carmen valencia": { lat: 39.4789, lon: -0.3777 },
  "triana sevilla": { lat: 37.3849, lon: -6.0048 },
  "nervion sevilla": { lat: 37.3829, lon: -5.9742 },
  // Capitales (centro)
  madrid: { lat: 40.4168, lon: -3.7038 },
  barcelona: { lat: 41.3851, lon: 2.1734 },
  valencia: { lat: 39.4699, lon: -0.3763 },
  sevilla: { lat: 37.3891, lon: -5.9845 },
  malaga: { lat: 36.7213, lon: -4.4214 },
  bilbao: { lat: 43.263, lon: -2.935 },
  zaragoza: { lat: 41.6488, lon: -0.8891 },
};

export function lookupMadridPlace(name: string): GeoPoint | null {
  const norm = normalize(name);
  const key = norm === "madrid" || norm.endsWith(" madrid") ? norm : `${norm} madrid`;
  return PLACES[key] ?? null;
}

export function lookupPlace(name: string): GeoPoint | null {
  const norm = normalize(name);
  if (PLACES[norm]) return PLACES[norm];

  // Coincidencia parcial: "piso en Malasaña" → "malasana madrid".
  for (const [key, point] of Object.entries(PLACES)) {
    if (norm.includes(key) || key.includes(norm)) return point;
    // Empareja por la primera palabra (barrio) si la ciudad no coincide.
    const barrio = key.split(" ")[0];
    if (barrio.length > 3 && norm.includes(barrio)) return point;
  }
  return null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
