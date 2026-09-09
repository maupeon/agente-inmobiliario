/** Los periodos internos conservan su formato para cálculos y caché. */
export function formatMarketPeriod(period: string): string {
  const compact = period.match(/^(\d{4})[TQ]([1-4])$/i);
  return compact ? `Q${compact[2]} ${compact[1]}` : period;
}

/** Documentación primaria; enlazarla no convierte un respaldo local en dato oficial. */
export const MARKET_SOURCES = {
  valuation: {
    label: "MIVAU · Estadística de valor tasado de vivienda",
    href: "https://www.mivau.gob.es/el-ministerio/observatorios-y-estadisticas/estadisticas/valor-tasado-vivienda",
    download: "https://apps.fomento.gob.es/boletinonline2/sedal/35101000.XLS",
  },
  ipv: {
    label: "INE · Índice de Precios de Vivienda (tabla 25171)",
    href: "https://www.ine.es/jaxiT3/Tabla.htm?t=25171",
  },
  rates: {
    label: "Banco de España · Estadísticas de tipos de interés",
    href: "https://www.bde.es/webbe/es/estadisticas/temas/tipos-interes.html",
  },
  rent: {
    label: "MIVAU · Metodología SERPAVI 2026 (PDF)",
    href: "https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03-18_Metodologia_SERPAVI.pdf",
  },
} as const;
