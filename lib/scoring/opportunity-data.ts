/** Transcripción contrastada de la columna «Variación anual», consulta 2026-09-14.
 * Un único informe y edición metodológica para ciudad y 21 distritos.
 * No son precios de cierre ni una previsión. No se reconstruyen niveles históricos
 * a partir de porcentajes redondeados. Actualización manual, no consulta en vivo.
 */
export const OPPORTUNITY_SOURCE = {
  source: "Idealista · informe de precios de venta",
  url: "https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/madrid-comunidad/madrid-provincia/madrid/",
  methodologyUrl: "https://st3.idealista.com/cms/archivos/static/price-indicator/es-metodologia-informes-de-precios-vivienda-2026.pdf",
  retrievedAt: "2026-09-14",
  start: "2025-08",
  end: "2026-08",
  period: "agosto de 2025 – agosto de 2026",
  methodology: "revisión de julio de 2026",
  city: "Madrid",
  cityGrowthPercent: 2.2,
} as const;

export const OPPORTUNITY_DISTRICTS = [
  { code: "01", district: "Centro", sourceName: "Centro", growthPercent: 3.3 },
  { code: "02", district: "Arganzuela", sourceName: "Arganzuela", growthPercent: 8.0 },
  { code: "03", district: "Retiro", sourceName: "Retiro", growthPercent: -0.5 },
  { code: "04", district: "Salamanca", sourceName: "Barrio de Salamanca", growthPercent: -1.9 },
  { code: "05", district: "Chamartín", sourceName: "Chamartín", growthPercent: 6.1 },
  { code: "06", district: "Tetuán", sourceName: "Tetuán", growthPercent: 7.6 },
  { code: "07", district: "Chamberí", sourceName: "Chamberí", growthPercent: 4.0 },
  { code: "08", district: "Fuencarral-El Pardo", sourceName: "Fuencarral", growthPercent: 7.8 },
  { code: "09", district: "Moncloa-Aravaca", sourceName: "Moncloa", growthPercent: 3.4 },
  { code: "10", district: "Latina", sourceName: "Latina", growthPercent: 8.1 },
  { code: "11", district: "Carabanchel", sourceName: "Carabanchel", growthPercent: 10.8 },
  { code: "12", district: "Usera", sourceName: "Usera", growthPercent: 18.3 },
  { code: "13", district: "Puente de Vallecas", sourceName: "Puente de Vallecas", growthPercent: 17.9 },
  { code: "14", district: "Moratalaz", sourceName: "Moratalaz", growthPercent: 14.8 },
  { code: "15", district: "Ciudad Lineal", sourceName: "Ciudad Lineal", growthPercent: 8.0 },
  { code: "16", district: "Hortaleza", sourceName: "Hortaleza", growthPercent: 7.3 },
  { code: "17", district: "Villaverde", sourceName: "Villaverde", growthPercent: 25.0 },
  { code: "18", district: "Villa de Vallecas", sourceName: "Villa de Vallecas", growthPercent: 12.5 },
  { code: "19", district: "Vicálvaro", sourceName: "Vicálvaro", growthPercent: 8.0 },
  { code: "20", district: "San Blas-Canillejas", sourceName: "San Blas", growthPercent: 7.0 },
  { code: "21", district: "Barajas", sourceName: "Barajas", growthPercent: 16.8 },
] as const;
