// Nombres de distrito usados por Idealista y su equivalente municipal.
// Solo se aplican al campo distrito del anuncio; no resuelven barrios ni direcciones.
const DISTRICT_ALIASES = new Map([
  ["barrio de salamanca", "salamanca"],
  ["fuencarral", "fuencarral el pardo"],
  ["moncloa", "moncloa aravaca"],
  ["san blas", "san blas canillejas"],
]);

export function normalizeMadridDistrict(value: string): string {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[\s-]+/g, " ");
  return DISTRICT_ALIASES.get(normalized) ?? normalized;
}
