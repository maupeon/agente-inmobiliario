import type { PropertyDetail } from "@/types";


/**
 * "Detalle" de un anuncio.
 *
 * La API pública de Idealista NO expone endpoint de ficha: solo búsqueda, y la
 * respuesta de búsqueda ya no trae descripción, galería completa ni certificado
 * energético. Volver a llamar a la API por cada ficha solo gastaría cuota
 * (1-2 peticiones) sin aportar nada que el cliente no tenga ya de la búsqueda.
 *
 * Por eso, en modo real devolvemos `null`: la UI pinta la ficha con el
 * `Property` que ya tiene y enlaza al anuncio en idealista.com. En
 * `MOCK_IDEALISTA=true` se conserva igualmente la ficha del resultado sintético.
 */
export async function getPropertyDetail(
  propertyCode: string
): Promise<PropertyDetail | null> {
  void propertyCode;
  // La ficha conserva los campos del resultado de búsqueda, también en demo.

  return null;
}
