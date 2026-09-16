import { CURRENT_SALE_YEAR, LAST_OBSERVED_SALE_YEAR, LAST_OBSERVED_RENT_YEAR } from "./current-model";

/** Año objetivo incorporado al paquete; las fuentes observadas son anteriores. */
export const INDEX_TARGET_YEAR = CURRENT_SALE_YEAR;
export const INDEX_UPDATE_NOTICE = `Escenario proyectado a ${INDEX_TARGET_YEAR} incorporado: últimas fuentes de venta de ${LAST_OBSERVED_SALE_YEAR} y alquiler de ${LAST_OBSERVED_RENT_YEAR}. Entrenamiento de 2018; precisión actual no validada.`;
