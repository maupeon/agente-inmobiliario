import type {
  BdeMortgageRates,
  IneIpvQuarterly,
  InePriceByProvince,
  RentReference,
} from "./types";

/**
 * Datos de respaldo plausibles (referencia cierre 2024). Se usan en dos casos:
 *  1. La cache de Supabase está vacía y todavía no se ha ejecutado el cron.
 *  2. El cron ha fallado al refrescar y queremos seguir respondiendo al usuario.
 *
 * Origen: medias publicadas por el INE (Estadística Registral Inmobiliaria)
 * y Banco de España. Son aproximadas — el cron las sustituye por el dato vivo.
 */

export const FALLBACK_PRICE_BY_PROVINCE: InePriceByProvince = {
  periodo: "2024T4",
  fuente: "Datos ilustrativos de respaldo; precios provinciales sin verificación documental",
  data: [
    { provincia: "Madrid", precioM2: 4150, variacionInteranual: 7.8 },
    { provincia: "Barcelona", precioM2: 3920, variacionInteranual: 6.4 },
    { provincia: "Baleares", precioM2: 4380, variacionInteranual: 9.1 },
    { provincia: "Guipúzcoa", precioM2: 3600, variacionInteranual: 4.2 },
    { provincia: "Vizcaya", precioM2: 3050, variacionInteranual: 4.0 },
    { provincia: "Málaga", precioM2: 2980, variacionInteranual: 11.3 },
    { provincia: "Las Palmas", precioM2: 2380, variacionInteranual: 6.7 },
    { provincia: "Santa Cruz de Tenerife", precioM2: 2210, variacionInteranual: 6.1 },
    { provincia: "Álava", precioM2: 2400, variacionInteranual: 3.8 },
    { provincia: "Navarra", precioM2: 2090, variacionInteranual: 4.3 },
    { provincia: "Valencia", precioM2: 2050, variacionInteranual: 8.9 },
    { provincia: "Alicante", precioM2: 2180, variacionInteranual: 9.4 },
    { provincia: "Cádiz", precioM2: 1980, variacionInteranual: 7.2 },
    { provincia: "Sevilla", precioM2: 1920, variacionInteranual: 6.5 },
    { provincia: "Granada", precioM2: 1530, variacionInteranual: 5.0 },
    { provincia: "Zaragoza", precioM2: 1760, variacionInteranual: 4.6 },
    { provincia: "Asturias", precioM2: 1480, variacionInteranual: 3.9 },
    { provincia: "Cantabria", precioM2: 1820, variacionInteranual: 4.8 },
    { provincia: "La Coruña", precioM2: 1640, variacionInteranual: 4.4 },
    { provincia: "Pontevedra", precioM2: 1520, variacionInteranual: 4.1 },
    { provincia: "Lugo", precioM2: 1100, variacionInteranual: 2.9 },
    { provincia: "Orense", precioM2: 1080, variacionInteranual: 2.6 },
    { provincia: "Toledo", precioM2: 1090, variacionInteranual: 3.5 },
    { provincia: "Guadalajara", precioM2: 1280, variacionInteranual: 3.8 },
    { provincia: "Murcia", precioM2: 1290, variacionInteranual: 5.1 },
    { provincia: "Almería", precioM2: 1350, variacionInteranual: 5.6 },
    { provincia: "Huelva", precioM2: 1230, variacionInteranual: 4.4 },
    { provincia: "Córdoba", precioM2: 1290, variacionInteranual: 4.0 },
    { provincia: "Jaén", precioM2: 940, variacionInteranual: 2.1 },
    { provincia: "Salamanca", precioM2: 1420, variacionInteranual: 3.2 },
    { provincia: "Valladolid", precioM2: 1500, variacionInteranual: 3.4 },
    { provincia: "Burgos", precioM2: 1320, variacionInteranual: 2.8 },
    { provincia: "León", precioM2: 1140, variacionInteranual: 2.5 },
    { provincia: "Palencia", precioM2: 1090, variacionInteranual: 2.3 },
    { provincia: "Soria", precioM2: 1060, variacionInteranual: 2.0 },
    { provincia: "Segovia", precioM2: 1390, variacionInteranual: 3.0 },
    { provincia: "Ávila", precioM2: 1080, variacionInteranual: 2.4 },
    { provincia: "Zamora", precioM2: 980, variacionInteranual: 2.1 },
    { provincia: "Cáceres", precioM2: 990, variacionInteranual: 2.5 },
    { provincia: "Badajoz", precioM2: 1010, variacionInteranual: 2.7 },
    { provincia: "Castellón", precioM2: 1370, variacionInteranual: 5.2 },
    { provincia: "Tarragona", precioM2: 1810, variacionInteranual: 5.7 },
    { provincia: "Lérida", precioM2: 1320, variacionInteranual: 4.0 },
    { provincia: "Gerona", precioM2: 2380, variacionInteranual: 6.2 },
    { provincia: "Huesca", precioM2: 1280, variacionInteranual: 3.6 },
    { provincia: "Teruel", precioM2: 950, variacionInteranual: 2.0 },
    { provincia: "Albacete", precioM2: 1110, variacionInteranual: 3.3 },
    { provincia: "Ciudad Real", precioM2: 920, variacionInteranual: 2.4 },
    { provincia: "Cuenca", precioM2: 940, variacionInteranual: 2.2 },
    { provincia: "La Rioja", precioM2: 1620, variacionInteranual: 3.7 },
    { provincia: "Ceuta", precioM2: 2110, variacionInteranual: 3.1 },
    { provincia: "Melilla", precioM2: 1970, variacionInteranual: 2.9 },
  ],
};

export const FALLBACK_MORTGAGE_RATES: BdeMortgageRates = {
  periodo: "2024-12",
  fuente: "Datos ilustrativos de respaldo; tipos de interés sin verificación documental",
  tipoMedio: 3.21,
  euribor12m: 2.44,
};

export const FALLBACK_IPV: IneIpvQuarterly = {
  fuente: "Datos ilustrativos de respaldo; evolución de precios sin verificación documental",
  serie: [
    { periodo: "2024T1", variacionInteranual: 6.3 },
    { periodo: "2024T2", variacionInteranual: 7.8 },
    { periodo: "2024T3", variacionInteranual: 8.2 },
    { periodo: "2024T4", variacionInteranual: 8.5 },
  ],
};

/**
 * Referencia de alquiler €/m²/mes. Aproximaciones plausibles (cierre 2024 /
 * inicio 2025) inspiradas en el Sistema Estatal de Índices de Precios de
 * Alquiler (MIVAU) y en portales del sector. Son orientativas — el cron las
 * sustituye cuando integremos el dataset oficial. Los barrios coinciden con
 * los que conoce el mock de Idealista para que la demo sea coherente.
 */
export const FALLBACK_RENT_REFERENCE: RentReference = {
  periodo: "2025T1",
  fuente: "Datos manuales ilustrativos de alquiler; no son una medición de mercado verificada",
  zonas: [
    { zona: "Salamanca", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 21.5, min: 18, max: 26 },
    { zona: "Chamberí", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 20.0, min: 17, max: 24 },
    { zona: "Malasaña", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 20.5, min: 17, max: 25 },
    { zona: "Centro", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 21.0, min: 17, max: 26 },
    { zona: "Lavapiés", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 18.0, min: 15, max: 22 },
    { zona: "Chamartín", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 18.5, min: 15, max: 23 },
    { zona: "Retiro", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 19.0, min: 16, max: 23 },
    { zona: "Tetuán", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 17.0, min: 14, max: 20 },
    { zona: "Arganzuela", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 18.0, min: 15, max: 21 },
    { zona: "Carabanchel", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 14.5, min: 12, max: 17 },
    { zona: "Vallecas", municipio: "Madrid", provincia: "Madrid", eurM2Mes: 13.5, min: 11, max: 16 },
    { zona: "Eixample", municipio: "Barcelona", provincia: "Barcelona", eurM2Mes: 20.5, min: 17, max: 25 },
    { zona: "Gràcia", municipio: "Barcelona", provincia: "Barcelona", eurM2Mes: 19.5, min: 16, max: 24 },
    { zona: "Ciutat Vella", municipio: "Barcelona", provincia: "Barcelona", eurM2Mes: 21.0, min: 17, max: 26 },
    { zona: "Sant Martí", municipio: "Barcelona", provincia: "Barcelona", eurM2Mes: 19.0, min: 16, max: 23 },
    { zona: "Sants", municipio: "Barcelona", provincia: "Barcelona", eurM2Mes: 17.5, min: 15, max: 21 },
    { zona: "Ruzafa", municipio: "Valencia", provincia: "Valencia", eurM2Mes: 13.5, min: 11, max: 17 },
    { zona: "El Carmen", municipio: "Valencia", provincia: "Valencia", eurM2Mes: 13.0, min: 11, max: 16 },
    { zona: "Triana", municipio: "Sevilla", provincia: "Sevilla", eurM2Mes: 11.5, min: 9, max: 14 },
    { zona: "Nervión", municipio: "Sevilla", provincia: "Sevilla", eurM2Mes: 11.0, min: 9, max: 13 },
  ],
  provincias: [
    { provincia: "Madrid", eurM2Mes: 17.0, min: 12, max: 24 },
    { provincia: "Barcelona", eurM2Mes: 17.5, min: 13, max: 24 },
    { provincia: "Baleares", eurM2Mes: 16.5, min: 12, max: 23 },
    { provincia: "Guipúzcoa", eurM2Mes: 14.5, min: 11, max: 19 },
    { provincia: "Vizcaya", eurM2Mes: 13.0, min: 10, max: 17 },
    { provincia: "Málaga", eurM2Mes: 13.5, min: 10, max: 19 },
    { provincia: "Las Palmas", eurM2Mes: 12.0, min: 9, max: 16 },
    { provincia: "Santa Cruz de Tenerife", eurM2Mes: 11.5, min: 9, max: 15 },
    { provincia: "Valencia", eurM2Mes: 11.5, min: 9, max: 15 },
    { provincia: "Alicante", eurM2Mes: 10.5, min: 8, max: 14 },
    { provincia: "Sevilla", eurM2Mes: 10.5, min: 8, max: 13 },
    { provincia: "Cádiz", eurM2Mes: 10.0, min: 8, max: 13 },
    { provincia: "Granada", eurM2Mes: 9.5, min: 7, max: 12 },
    { provincia: "Zaragoza", eurM2Mes: 9.5, min: 7, max: 12 },
    { provincia: "Navarra", eurM2Mes: 11.0, min: 8, max: 14 },
    { provincia: "Murcia", eurM2Mes: 8.0, min: 6, max: 11 },
    { provincia: "Asturias", eurM2Mes: 8.5, min: 6, max: 11 },
    { provincia: "La Coruña", eurM2Mes: 9.0, min: 7, max: 12 },
    { provincia: "Valladolid", eurM2Mes: 8.5, min: 7, max: 11 },
  ],
};
