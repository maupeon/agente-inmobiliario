import type { PropertyValuation } from "@/types";

/** Identidad del artefacto de inferencia de habitia_predictor. */
export const CURRENT_MODEL_ID = "habitIA-xgboost-2018-v3";
export const CURRENT_MODEL_VERSION = "3.3.0";
export const CURRENT_MODEL_SHA256 = "e5526aca6001741f24eb976dbd9607df131b3822b5b5a01b66c6c92af2a9d748";
/** Los pesos no cambian: identifica también índices y variables de barrio. */
export const CURRENT_PACKAGE_SHA256 = "043304773c081968a67703429bbe028b3f397b1ccc49f2856fa0df91e7a079fc";
export const CURRENT_SALE_YEAR = 2026;
export const CURRENT_RENT_YEAR = 2026;
export const LAST_OBSERVED_SALE_YEAR = 2025;
export const LAST_OBSERVED_RENT_YEAR = 2024;
export const STALE_MODEL_NOTICE = "La estimación guardada corresponde a un modelo anterior. Actualiza la valoración para calcular Fair y el HabitIA Score con el modelo vigente.";

export function isCurrentModel(value: { model_id?: unknown; model_version?: unknown; modelo_sha256?: unknown; paquete_sha256?: unknown } | null | undefined): boolean {
  return value?.model_id === CURRENT_MODEL_ID && value.model_version === CURRENT_MODEL_VERSION
    && value.modelo_sha256 === CURRENT_MODEL_SHA256 && value.paquete_sha256 === CURRENT_PACKAGE_SHA256;
}

export function isCurrentValuation(value: PropertyValuation | null | undefined): value is PropertyValuation & { modeloVersion: string; modeloId: typeof CURRENT_MODEL_ID; modeloSha256: string } {
  return !!value && isCurrentModel({ model_id: value.modeloId, model_version: value.modeloVersion,
    modelo_sha256: value.modeloSha256, paquete_sha256: value.modeloPaqueteSha256 });
}

/** Conserva el anuncio y los demás datos; nunca reutiliza cifras del predictor sustituido. */
export function withoutStaleValuation(value: PropertyValuation | null): PropertyValuation | null {
  if (!value || value.nivel !== "modelo" || isCurrentValuation(value)) return value;
  return { operacion: value.operacion, eurM2: value.eurM2, referenciaEurM2: null,
    diferenciaPorcentual: null, etiqueta: null, banda: null, nivel: null,
    referencia: null, fromFallback: false, estadoModelo: "no_disponible", avisoModelo: STALE_MODEL_NOTICE };
}
