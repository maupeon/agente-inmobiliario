import { runCompararAlquilerCompra } from "@/lib/finance/rent-vs-buy";
import type { RentVsBuyInput } from "@/types";

export type CompararAlquilerCompraInput = Partial<RentVsBuyInput>;

/**
 * Tool del agente: compara comprar vs alquilar e invertir maximizando el
 * patrimonio neto a largo plazo. Envuelve el motor puro `runCompararAlquilerCompra`
 * y devuelve un RESUMEN COMPACTO (no la serie completa) para no inflar el
 * contexto del modelo. La calculadora visual vive en /comprar-o-alquilar.
 */
export function runCompararAlquilerCompraTool(input: CompararAlquilerCompraInput) {
  const r = runCompararAlquilerCompra(input ?? {});
  const i = r.inputs;
  return {
    veredicto: {
      ganador: r.veredicto.ganador,
      banda: r.veredicto.banda,
      resumen: r.veredicto.resumen,
      recomendacionPractica: r.veredicto.overrideSubjetivo ?? r.veredicto.ganador,
      overridePorMovilidad: r.veredicto.overrideSubjetivo != null,
    },
    horizonteAnios: i.horizonteAnios,
    enReales: r.enReales,
    breakEvenAnios: r.breakEvenAnios,
    patrimonioFinalCompra: r.patrimonioFinalCompra,
    patrimonioFinalAlquiler: r.patrimonioFinalAlquiler,
    ventajaCompra: r.ventajaCompra,
    ventajaPorcentual: r.ventajaPorcentual,
    cuotaMensual: r.cuotaMensual,
    desembolsoInicialCompra: r.desembolsoInicialCompra,
    priceToRent: r.priceToRent,
    feasible: r.feasible,
    precioMaxFinanciable: r.precioMaxFinanciable,
    avisos: r.avisos.map((a) => ({ severidad: a.severidad, sesgo: a.sesgo, mensaje: a.mensaje })),
    supuestos: {
      precioVivienda: i.precioVivienda,
      alquilerMensual: i.alquilerMensual,
      capitalDisponible: i.capitalDisponible,
      entradaPorcentaje: i.entradaPorcentaje,
      tipoInteres: i.tipoInteres,
      plazoHipotecaAnios: i.plazoHipotecaAnios,
      rentabilidadInversionAnual: i.rentabilidadInversionAnual,
      revalorizacionViviendaAnual: i.revalorizacionViviendaAnual,
      subidaAlquilerAnual: i.subidaAlquilerAnual,
    },
    nota: "Modelo orientativo (Madrid), no es asesoramiento financiero. Para el desglose visual completo, abre la calculadora en /comprar-o-alquilar.",
  };
}
