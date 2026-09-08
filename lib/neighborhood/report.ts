import type { NeighborhoodReport } from "@/types";
/** Los antiguos índices manuales no son mediciones verificadas y no se publican. */
export function buildNeighborhoodReport(zona: string, _provincia?: string): NeighborhoodReport {
  void _provincia;
  return {
    zona: { consultada: zona, encontrada: null, nivel: null },
    seguridad: { indice: null, etiqueta: null, tasaCriminalidad: null },
    calidadVida: { indiceGlobal: null, indicadores: [] },
    resumen: "No disponemos de indicadores verificables a escala de barrio. Los índices manuales se han retirado de la comparación y del ranking.",
    fuentes: { seguridad: "Sin fuente verificada a escala de barrio", calidadVida: "Sin medición verificada" },
    actualizado: null, fromFallback: true, aproximado: true,
  };
}
