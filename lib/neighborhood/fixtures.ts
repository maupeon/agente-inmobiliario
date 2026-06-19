/**
 * Datos curados de barrio: seguridad + calidad de vida. Son ORIENTATIVOS,
 * compuestos a partir de fuentes públicas (Balance de Criminalidad del
 * Ministerio del Interior por municipio, datos de transporte y zonas verdes
 * municipales) y de conocimiento general de cada zona. No son cifras oficiales
 * en vivo a nivel de barrio — el informe siempre se etiqueta como aproximado.
 *
 * Escalas 0-100. `seguridad` alto = más seguro. `tasaCriminalidad` =
 * infracciones penales por 1.000 habitantes/año (contexto, menor es mejor).
 * Los barrios coinciden con los que conoce el mock de Idealista.
 */

export interface NeighborhoodFixture {
  zona: string;
  municipio?: string;
  provincia?: string;
  seguridad: number;
  tasaCriminalidad: number;
  transporte: number;
  zonasVerdes: number;
  servicios: number;
  vidaNocturna: number;
  tranquilidad: number;
}

export const NEIGHBORHOOD_FIXTURES: NeighborhoodFixture[] = [
  // ── Madrid ──────────────────────────────────────────────────────────────
  { zona: "Salamanca", municipio: "Madrid", provincia: "Madrid", seguridad: 82, tasaCriminalidad: 48, transporte: 92, zonasVerdes: 62, servicios: 95, vidaNocturna: 78, tranquilidad: 70 },
  { zona: "Chamberí", municipio: "Madrid", provincia: "Madrid", seguridad: 80, tasaCriminalidad: 50, transporte: 90, zonasVerdes: 58, servicios: 90, vidaNocturna: 74, tranquilidad: 68 },
  { zona: "Retiro", municipio: "Madrid", provincia: "Madrid", seguridad: 85, tasaCriminalidad: 42, transporte: 86, zonasVerdes: 95, servicios: 84, vidaNocturna: 60, tranquilidad: 80 },
  { zona: "Chamartín", municipio: "Madrid", provincia: "Madrid", seguridad: 84, tasaCriminalidad: 44, transporte: 88, zonasVerdes: 66, servicios: 86, vidaNocturna: 58, tranquilidad: 78 },
  { zona: "Malasaña", municipio: "Madrid", provincia: "Madrid", seguridad: 70, tasaCriminalidad: 78, transporte: 90, zonasVerdes: 40, servicios: 88, vidaNocturna: 96, tranquilidad: 42 },
  { zona: "Centro", municipio: "Madrid", provincia: "Madrid", seguridad: 64, tasaCriminalidad: 98, transporte: 95, zonasVerdes: 38, servicios: 92, vidaNocturna: 94, tranquilidad: 36 },
  { zona: "Lavapiés", municipio: "Madrid", provincia: "Madrid", seguridad: 60, tasaCriminalidad: 88, transporte: 88, zonasVerdes: 42, servicios: 82, vidaNocturna: 84, tranquilidad: 44 },
  { zona: "Tetuán", municipio: "Madrid", provincia: "Madrid", seguridad: 66, tasaCriminalidad: 70, transporte: 84, zonasVerdes: 46, servicios: 80, vidaNocturna: 64, tranquilidad: 54 },
  { zona: "Arganzuela", municipio: "Madrid", provincia: "Madrid", seguridad: 78, tasaCriminalidad: 52, transporte: 84, zonasVerdes: 78, servicios: 82, vidaNocturna: 58, tranquilidad: 72 },
  { zona: "Carabanchel", municipio: "Madrid", provincia: "Madrid", seguridad: 62, tasaCriminalidad: 66, transporte: 78, zonasVerdes: 56, servicios: 74, vidaNocturna: 50, tranquilidad: 62 },
  { zona: "Vallecas", municipio: "Madrid", provincia: "Madrid", seguridad: 60, tasaCriminalidad: 68, transporte: 76, zonasVerdes: 54, servicios: 72, vidaNocturna: 48, tranquilidad: 60 },

  // ── Barcelona ───────────────────────────────────────────────────────────
  { zona: "Eixample", municipio: "Barcelona", provincia: "Barcelona", seguridad: 70, tasaCriminalidad: 82, transporte: 94, zonasVerdes: 50, servicios: 92, vidaNocturna: 80, tranquilidad: 56 },
  { zona: "Gràcia", municipio: "Barcelona", provincia: "Barcelona", seguridad: 74, tasaCriminalidad: 64, transporte: 86, zonasVerdes: 56, servicios: 88, vidaNocturna: 82, tranquilidad: 60 },
  { zona: "Ciutat Vella", municipio: "Barcelona", provincia: "Barcelona", seguridad: 55, tasaCriminalidad: 120, transporte: 92, zonasVerdes: 40, servicios: 88, vidaNocturna: 92, tranquilidad: 34 },
  { zona: "Sant Martí", municipio: "Barcelona", provincia: "Barcelona", seguridad: 72, tasaCriminalidad: 60, transporte: 84, zonasVerdes: 64, servicios: 80, vidaNocturna: 62, tranquilidad: 66 },
  { zona: "Sants", municipio: "Barcelona", provincia: "Barcelona", seguridad: 70, tasaCriminalidad: 66, transporte: 88, zonasVerdes: 52, servicios: 82, vidaNocturna: 64, tranquilidad: 60 },

  // ── Valencia ────────────────────────────────────────────────────────────
  { zona: "Ruzafa", municipio: "Valencia", provincia: "Valencia", seguridad: 72, tasaCriminalidad: 62, transporte: 82, zonasVerdes: 54, servicios: 88, vidaNocturna: 88, tranquilidad: 52 },
  { zona: "El Carmen", municipio: "Valencia", provincia: "Valencia", seguridad: 66, tasaCriminalidad: 74, transporte: 80, zonasVerdes: 48, servicios: 84, vidaNocturna: 86, tranquilidad: 46 },

  // ── Sevilla ─────────────────────────────────────────────────────────────
  { zona: "Triana", municipio: "Sevilla", provincia: "Sevilla", seguridad: 76, tasaCriminalidad: 54, transporte: 78, zonasVerdes: 58, servicios: 84, vidaNocturna: 80, tranquilidad: 62 },
  { zona: "Nervión", municipio: "Sevilla", provincia: "Sevilla", seguridad: 78, tasaCriminalidad: 50, transporte: 82, zonasVerdes: 60, servicios: 86, vidaNocturna: 62, tranquilidad: 70 },
];

/**
 * Respaldo por provincia para zonas no cubiertas. Valores medios plausibles
 * por capital de provincia.
 */
export interface NeighborhoodProvinceFixture {
  provincia: string;
  seguridad: number;
  tasaCriminalidad: number;
  transporte: number;
  zonasVerdes: number;
  servicios: number;
  vidaNocturna: number;
  tranquilidad: number;
}

export const NEIGHBORHOOD_PROVINCE_FIXTURES: NeighborhoodProvinceFixture[] = [
  { provincia: "Madrid", seguridad: 72, tasaCriminalidad: 62, transporte: 86, zonasVerdes: 58, servicios: 84, vidaNocturna: 74, tranquilidad: 58 },
  { provincia: "Barcelona", seguridad: 66, tasaCriminalidad: 78, transporte: 88, zonasVerdes: 54, servicios: 84, vidaNocturna: 78, tranquilidad: 54 },
  { provincia: "Valencia", seguridad: 74, tasaCriminalidad: 56, transporte: 78, zonasVerdes: 56, servicios: 80, vidaNocturna: 72, tranquilidad: 60 },
  { provincia: "Sevilla", seguridad: 74, tasaCriminalidad: 54, transporte: 74, zonasVerdes: 56, servicios: 80, vidaNocturna: 72, tranquilidad: 62 },
  { provincia: "Málaga", seguridad: 72, tasaCriminalidad: 58, transporte: 70, zonasVerdes: 58, servicios: 80, vidaNocturna: 78, tranquilidad: 60 },
  { provincia: "Vizcaya", seguridad: 80, tasaCriminalidad: 44, transporte: 82, zonasVerdes: 64, servicios: 82, vidaNocturna: 64, tranquilidad: 70 },
  { provincia: "Guipúzcoa", seguridad: 82, tasaCriminalidad: 40, transporte: 78, zonasVerdes: 70, servicios: 80, vidaNocturna: 62, tranquilidad: 74 },
  { provincia: "Baleares", seguridad: 70, tasaCriminalidad: 64, transporte: 60, zonasVerdes: 60, servicios: 76, vidaNocturna: 76, tranquilidad: 62 },
  { provincia: "Zaragoza", seguridad: 76, tasaCriminalidad: 50, transporte: 78, zonasVerdes: 60, servicios: 80, vidaNocturna: 62, tranquilidad: 66 },
  { provincia: "Las Palmas", seguridad: 70, tasaCriminalidad: 60, transporte: 64, zonasVerdes: 54, servicios: 74, vidaNocturna: 70, tranquilidad: 60 },
];
