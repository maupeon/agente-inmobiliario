/**
 * Prueba de humo de la API real de Idealista (sin mock, sin agente).
 * Replica lib/idealista/auth.ts + search.ts con fetch directo.
 *
 * Uso (Node 20+, lee .env.local automáticamente):
 *   node --env-file=.env.local scripts/test-idealista.mjs
 *   node --env-file=.env.local scripts/test-idealista.mjs "Malasaña, Madrid" venta
 *
 * OJO: cada ejecución consume cuota real de tu key de Idealista.
 */

const apiKey = process.env.IDEALISTA_API_KEY;
const secret = process.env.IDEALISTA_SECRET;
const baseUrl = process.env.IDEALISTA_BASE_URL ?? "https://api.idealista.com/3.5/";

const zona = process.argv[2] ?? "Madrid";
const operacion = process.argv[3] ?? "venta"; // "venta" | "alquiler"

if (!apiKey || !secret) {
  console.error("✗ Falta IDEALISTA_API_KEY o IDEALISTA_SECRET en .env.local");
  process.exit(1);
}

async function getToken() {
  const credentials = Buffer.from(`${apiKey}:${secret}`).toString("base64");
  const res = await fetch("https://api.idealista.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: "grant_type=client_credentials&scope=read",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`auth ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  console.log(`✓ Token OK (expira en ${data.expires_in}s)`);
  return data.access_token;
}

// Gazetteer mínimo (coincide con lib/commute/places.ts); fallback a Nominatim.
const PLACES = {
  madrid: { lat: 40.4168, lon: -3.7038 },
  "malasana madrid": { lat: 40.4258, lon: -3.7036 },
  "chamberi madrid": { lat: 40.4319, lon: -3.7036 },
  "salamanca madrid": { lat: 40.4279, lon: -3.6826 },
  barcelona: { lat: 41.3851, lon: 2.1734 },
  valencia: { lat: 39.4699, lon: -0.3763 },
  sevilla: { lat: 37.3891, lon: -5.9845 },
};

function normalizePlace(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
}

async function resolveCenter(name) {
  const norm = normalizePlace(name);
  if (PLACES[norm]) return PLACES[norm];
  for (const [key, point] of Object.entries(PLACES)) {
    if (norm.includes(key) || key.includes(norm)) return point;
  }
  // Nominatim (sin clave) como en lib/commute/index.ts.
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { "User-Agent": "HabitIA/1.0 (TFM)", "Accept-Language": "es" } });
  if (!res.ok) return null;
  const arr = await res.json();
  const hit = arr?.[0];
  return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

async function search(token) {
  const center = await resolveCenter(zona);
  if (!center) throw new Error(`no pude geocodificar "${zona}"`);
  const params = new URLSearchParams({
    country: "es",
    operation: operacion === "alquiler" ? "rent" : "sale",
    propertyType: "homes",
    locale: "es",
    maxItems: "5",
    numPage: "1",
    // La API EXIGE center+distance o locationId (NO existe locationName).
    center: `${center.lat},${center.lon}`,
    distance: "3500",
  });
  const url = `${baseUrl.replace(/\/$/, "")}/es/search`;
  console.log(`→ POST ${url}`);
  console.log(`  ${params.toString()}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`search ${res.status}: ${text.slice(0, 500)}`);

  const data = JSON.parse(text);
  const list = data.elementList ?? [];
  console.log(`✓ ${list.length} resultados (total: ${data.total ?? "?"})\n`);
  for (const el of list) {
    console.log(
      `  • ${el.price}€  ${el.size}m²  ${el.rooms}hab  — ${el.address} [${el.propertyCode}]`
    );
  }
}

try {
  const token = await getToken();
  await search(token);
} catch (err) {
  console.error("✗", err.message);
  process.exit(1);
}
