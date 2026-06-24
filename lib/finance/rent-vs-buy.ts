import type {
  Nivel3,
  RentVsBuyAviso,
  RentVsBuyInput,
  RentVsBuyResult,
  RentVsBuyYear,
} from "@/types";

/**
 * Motor financiero "Comprar o alquilar" (Madrid).
 *
 * Función PURA y síncrona: dado un perfil económico, simula AÑO A AÑO el
 * patrimonio neto LIQUIDABLE de ambos escenarios bajo NEUTRALIDAD
 * PRESUPUESTARIA y devuelve la serie, el año de equilibrio (break-even) y un
 * veredicto. No hace I/O ni depende de React: se ejecuta igual en el cliente
 * (recálculo en vivo) y en el servidor (tool del agente).
 *
 * Metodología (resumen):
 *  - Ambos parten del MISMO capital. El comprador desembolsa entrada + gastos;
 *    el inquilino lo mantiene invertido. Cada año, quien gasta menos en vivienda
 *    invierte la diferencia en una cartera que crece al MISMO tipo en ambos.
 *  - Patrimonio = equity inmobiliaria (valor − saldo − costes/impuestos de venta)
 *    + cartera NETA del impuesto del ahorro sobre la plusvalía latente.
 *  - El veredicto sale del break-even simulado, no de reglas heurísticas.
 *
 * Correcciones al boceto original: neutralidad presupuestaria (no 30k vs 0k);
 * misma rentabilidad de cartera en ambos; intereses decrecientes (no constantes);
 * gastos de compra (t=0) separados de los de venta (al liquidar); cartera gravada
 * al liquidar; mantenimiento incluido. No es asesoramiento financiero.
 */

const round = (x: number) => Math.round(x);
const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const anios = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");

/** Valores por defecto coherentes para Madrid (reproducen el boceto del cliente). */
export const RENT_VS_BUY_DEFAULTS: RentVsBuyInput = {
  // Comunes
  precioVivienda: 400000,
  alquilerMensual: 1250,
  capitalDisponible: 120000,
  horizonteAnios: 10,
  rentabilidadInversionAnual: 7,
  inflacionAnual: 2.5,
  mostrarEnReales: true,
  liquidarCarteraAlFinal: true,
  // Compra
  entradaPorcentaje: 20,
  tipoInteres: 3,
  plazoHipotecaAnios: 30,
  esObraNueva: false,
  gastosCompraPorcentaje: 10,
  gastosVentaPorcentaje: 6,
  plusvaliaMunicipalPorcentaje: 0.5,
  ibiAnual: 900,
  comunidadMensual: 120,
  seguroHogarAnual: 300,
  mantenimientoPorcentaje: 1,
  revalorizacionViviendaAnual: 4,
  inflacionCostes: 2,
  viviendaHabitual: true,
  // Alquiler
  subidaAlquilerAnual: 4,
  seguroInquilinoAnual: 0,
  // Personal
  probMudanzaExtranjero: 1,
  aniosHastaMudanza: 0,
  escenarioMudanza: 1,
  paisDestinoFueraUE: true,
  liquidezNecesaria: 0,
  estabilidadLaboral: 1,
  crecimientoSalarialEsperado: 0,
  ingresoAnualNeto: 45000,
};

/** Metadatos de cada campo para construir el formulario y los tooltips. */
export interface RentVsBuyField {
  campo: keyof RentVsBuyInput;
  etiqueta: string;
  unidad: "EUR" | "%" | "años" | "EUR/mes" | "EUR/año" | "boolean" | "enum";
  min: number;
  max: number;
  step?: number;
  avanzado: boolean;
  grupo: "comun" | "compra" | "alquiler" | "personal";
  nota: string;
  /** Etiquetas para unidad "enum" (índice 0..n). */
  opciones?: string[];
}

export const RENT_VS_BUY_FIELDS: RentVsBuyField[] = [
  { campo: "precioVivienda", etiqueta: "Precio de la vivienda", unidad: "EUR", min: 50000, max: 3000000, step: 5000, avanzado: false, grupo: "compra", nota: "El piso que te plantearías comprar." },
  { campo: "alquilerMensual", etiqueta: "Alquiler de un piso equivalente", unidad: "EUR/mes", min: 300, max: 10000, step: 25, avanzado: false, grupo: "alquiler", nota: "Clave: el alquiler de una vivienda comparable a la de compra, no tu alquiler actual de algo más pequeño." },
  { campo: "capitalDisponible", etiqueta: "Ahorro disponible hoy", unidad: "EUR", min: 0, max: 4500000, step: 5000, avanzado: false, grupo: "comun", nota: "Efectivo que podrías destinar a esto. Cubre entrada + gastos de compra." },
  { campo: "horizonteAnios", etiqueta: "Años que te quedarías", unidad: "años", min: 1, max: 40, step: 1, avanzado: false, grupo: "comun", nota: "El factor más decisivo: en horizontes cortos los costes de comprar y vender dominan." },
  { campo: "entradaPorcentaje", etiqueta: "Entrada", unidad: "%", min: 0, max: 100, step: 1, avanzado: false, grupo: "compra", nota: "El banco suele financiar hasta el 80% (entrada 20%). Por debajo del 20% es poco habitual en España." },
  { campo: "tipoInteres", etiqueta: "Tipo de interés (TIN fijo)", unidad: "%", min: 0, max: 12, step: 0.1, avanzado: false, grupo: "compra", nota: "Tipo fijo de referencia en Madrid ~3% (Banco de España)." },
  { campo: "plazoHipotecaAnios", etiqueta: "Plazo de la hipoteca", unidad: "años", min: 5, max: 40, step: 1, avanzado: false, grupo: "compra", nota: "Si el plazo es menor que tu horizonte, al terminar la hipoteca el dinero de la cuota pasa a invertirse." },
  { campo: "rentabilidadInversionAnual", etiqueta: "Rentabilidad de tus inversiones", unidad: "%", min: 0, max: 12, step: 0.5, avanzado: false, grupo: "comun", nota: "Rentabilidad bruta esperada de la cartera. La misma en ambos escenarios (el mercado no paga más por alquilar)." },
  { campo: "revalorizacionViviendaAnual", etiqueta: "Revalorización de la vivienda", unidad: "%", min: -5, max: 12, step: 0.5, avanzado: false, grupo: "compra", nota: "Distinta de la rentabilidad de la cartera. La vivienda en Madrid tiene ciclos, también caídas." },
  { campo: "subidaAlquilerAnual", etiqueta: "Subida anual del alquiler", unidad: "%", min: 0, max: 10, step: 0.5, avanzado: false, grupo: "alquiler", nota: "El índice de referencia histórico ronda el 2-3,5%; por encima del 4% es un supuesto agresivo." },

  // Avanzados — compra
  { campo: "esObraNueva", etiqueta: "Obra nueva", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "compra", nota: "Segunda mano: ITP 6% en Madrid. Obra nueva: IVA 10% + AJD 0,75%." },
  { campo: "gastosCompraPorcentaje", etiqueta: "Gastos de compra", unidad: "%", min: 7, max: 15, step: 0.5, avanzado: true, grupo: "compra", nota: "ITP/IVA + notaría + registro + gestoría + tasación. ~10% en segunda mano en Madrid." },
  { campo: "gastosVentaPorcentaje", etiqueta: "Gastos de venta", unidad: "%", min: 3, max: 10, step: 0.5, avanzado: true, grupo: "compra", nota: "Agencia 3-5% + cancelación registral de la hipoteca. La plusvalía municipal va aparte." },
  { campo: "plusvaliaMunicipalPorcentaje", etiqueta: "Plusvalía municipal (estimada)", unidad: "%", min: 0, max: 3, step: 0.1, avanzado: true, grupo: "compra", nota: "Proxy del IIVTNU sobre el suelo. No se aplica si transmites por debajo del precio de compra. Aproximado." },
  { campo: "ibiAnual", etiqueta: "IBI anual", unidad: "EUR/año", min: 0, max: 10000, step: 50, avanzado: true, grupo: "compra", nota: "Grava el valor catastral. Para 400K en Madrid suelen ser 700-1.300 €/año." },
  { campo: "comunidadMensual", etiqueta: "Comunidad", unidad: "EUR/mes", min: 0, max: 1000, step: 10, avanzado: true, grupo: "compra", nota: "Fondo perdido del propietario." },
  { campo: "seguroHogarAnual", etiqueta: "Seguro de hogar", unidad: "EUR/año", min: 0, max: 3000, step: 25, avanzado: true, grupo: "compra", nota: "Obligatorio (al menos incendios) con hipoteca." },
  { campo: "mantenimientoPorcentaje", etiqueta: "Mantenimiento", unidad: "%", min: 0, max: 3, step: 0.1, avanzado: true, grupo: "compra", nota: "Regla habitual ~1%/año del valor. El coste oculto mayor del propietario." },
  { campo: "viviendaHabitual", etiqueta: "Es tu vivienda habitual", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "compra", nota: "Si reinviertes en otra habitual o tienes >65 años, la ganancia de la venta está exenta de IRPF." },

  // Avanzados — alquiler / comunes
  { campo: "seguroInquilinoAnual", etiqueta: "Seguro del inquilino", unidad: "EUR/año", min: 0, max: 500, step: 10, avanzado: true, grupo: "alquiler", nota: "Opcional." },
  { campo: "inflacionAnual", etiqueta: "Inflación general (IPC)", unidad: "%", min: 0, max: 8, step: 0.1, avanzado: true, grupo: "comun", nota: "Para mostrar el patrimonio en € de hoy (reales)." },
  { campo: "inflacionCostes", etiqueta: "Inflación de costes de tenencia", unidad: "%", min: 0, max: 8, step: 0.1, avanzado: true, grupo: "compra", nota: "IBI, comunidad y seguro crecen con el IPC." },

  // Personal / subjetivo
  { campo: "probMudanzaExtranjero", etiqueta: "Probabilidad de mudarte al extranjero", unidad: "enum", min: 0, max: 2, avanzado: false, grupo: "personal", nota: "Si es alta, vender o alquilar a distancia puede comerse la ventaja de comprar.", opciones: ["Baja", "Media", "Alta"] },
  { campo: "aniosHastaMudanza", etiqueta: "Años hasta la mudanza prevista", unidad: "años", min: 0, max: 40, step: 1, avanzado: true, grupo: "personal", nota: "0 = sin mudanza prevista. Si es antes del equilibrio, dispara un aviso." },
  { campo: "paisDestinoFueraUE", etiqueta: "Destino fuera de la UE (ej. Suiza)", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "personal", nota: "Fuera de la UE el IRNR del alquiler es del 24% sin deducir gastos; dentro de la UE, 19% deduciendo." },
  { campo: "liquidezNecesaria", etiqueta: "Colchón de liquidez a mantener", unidad: "EUR", min: 0, max: 4500000, step: 5000, avanzado: false, grupo: "personal", nota: "Si comprar te deja por debajo de este colchón, te avisamos." },
  { campo: "estabilidadLaboral", etiqueta: "Estabilidad laboral", unidad: "enum", min: 0, max: 2, avanzado: false, grupo: "personal", nota: "Atarse a una cuota fija con ingresos inciertos es arriesgado.", opciones: ["Baja", "Media", "Alta"] },
  { campo: "crecimientoSalarialEsperado", etiqueta: "Crecimiento salarial esperado", unidad: "%", min: 0, max: 50, step: 5, avanzado: true, grupo: "personal", nota: "Si esperas un salto grande pronto, quizá compense esperar y comprar después." },
  { campo: "ingresoAnualNeto", etiqueta: "Ingreso anual neto", unidad: "EUR/año", min: 12000, max: 500000, step: 1000, avanzado: true, grupo: "personal", nota: "Solo para avisos de esfuerzo de la cuota. No entra en el cálculo de patrimonio." },
];

/** Impuesto de la base del ahorro IRPF (tramos 2024-25). g = ganancia (>0). */
function tramosAhorro(g: number): number {
  if (g <= 0) return 0;
  const tramos: Array<[number, number]> = [
    [6000, 0.19], // 0 – 6.000
    [44000, 0.21], // 6.000 – 50.000
    [150000, 0.23], // 50.000 – 200.000
    [100000, 0.27], // 200.000 – 300.000
    [Infinity, 0.28], // > 300.000
  ];
  let imp = 0;
  let rem = g;
  for (const [ancho, tipo] of tramos) {
    const x = Math.min(rem, ancho);
    imp += x * tipo;
    rem -= x;
    if (rem <= 0) break;
  }
  return imp;
}

function normalizar(input: Partial<RentVsBuyInput>): RentVsBuyInput {
  const d = RENT_VS_BUY_DEFAULTS;
  const m = RENT_VS_BUY_FIELDS;
  const get = (k: keyof RentVsBuyInput): number => {
    const raw = input[k];
    const meta = m.find((f) => f.campo === k);
    if (meta && meta.unidad === "boolean") {
      const v = raw === undefined ? (d[k] as unknown as boolean) : Boolean(raw);
      return v ? 1 : 0;
    }
    const v = raw === undefined ? (d[k] as unknown as number) : Number(raw);
    if (meta) return clamp(v, meta.min, meta.max);
    return Number.isFinite(v) ? v : (d[k] as unknown as number);
  };
  return {
    precioVivienda: get("precioVivienda"),
    alquilerMensual: get("alquilerMensual"),
    capitalDisponible: get("capitalDisponible"),
    horizonteAnios: Math.round(get("horizonteAnios")),
    rentabilidadInversionAnual: get("rentabilidadInversionAnual"),
    inflacionAnual: get("inflacionAnual"),
    mostrarEnReales: (input.mostrarEnReales ?? d.mostrarEnReales) ? true : false,
    liquidarCarteraAlFinal: (input.liquidarCarteraAlFinal ?? d.liquidarCarteraAlFinal) ? true : false,
    entradaPorcentaje: get("entradaPorcentaje"),
    tipoInteres: get("tipoInteres"),
    plazoHipotecaAnios: Math.round(get("plazoHipotecaAnios")),
    esObraNueva: get("esObraNueva") === 1,
    gastosCompraPorcentaje: get("gastosCompraPorcentaje"),
    gastosVentaPorcentaje: get("gastosVentaPorcentaje"),
    plusvaliaMunicipalPorcentaje: get("plusvaliaMunicipalPorcentaje"),
    ibiAnual: get("ibiAnual"),
    comunidadMensual: get("comunidadMensual"),
    seguroHogarAnual: get("seguroHogarAnual"),
    mantenimientoPorcentaje: get("mantenimientoPorcentaje"),
    revalorizacionViviendaAnual: get("revalorizacionViviendaAnual"),
    inflacionCostes: get("inflacionCostes"),
    viviendaHabitual: get("viviendaHabitual") === 1,
    subidaAlquilerAnual: get("subidaAlquilerAnual"),
    seguroInquilinoAnual: get("seguroInquilinoAnual"),
    probMudanzaExtranjero: Math.round(clamp(input.probMudanzaExtranjero ?? d.probMudanzaExtranjero, 0, 2)) as Nivel3,
    aniosHastaMudanza: Math.round(get("aniosHastaMudanza")),
    escenarioMudanza: (Math.round(clamp(input.escenarioMudanza ?? d.escenarioMudanza, 0, 1)) as 0 | 1),
    paisDestinoFueraUE: get("paisDestinoFueraUE") === 1,
    liquidezNecesaria: get("liquidezNecesaria"),
    estabilidadLaboral: Math.round(clamp(input.estabilidadLaboral ?? d.estabilidadLaboral, 0, 2)) as Nivel3,
    crecimientoSalarialEsperado: get("crecimientoSalarialEsperado"),
    ingresoAnualNeto: get("ingresoAnualNeto"),
  };
}

export function runCompararAlquilerCompra(
  inputParcial: Partial<RentVsBuyInput> = {}
): RentVsBuyResult {
  const in_ = normalizar(inputParcial);
  const N = in_.horizonteAnios;

  // ── 1) Inicialización (t=0) ──
  const entrada = (in_.precioVivienda * in_.entradaPorcentaje) / 100;
  const principalInicial = in_.precioVivienda - entrada;
  const gastosCompraPct = in_.esObraNueva
    ? Math.max(in_.gastosCompraPorcentaje, 11.5)
    : in_.gastosCompraPorcentaje;
  const gastosCompra = (in_.precioVivienda * gastosCompraPct) / 100;
  const desembolsoInicialCompra = entrada + gastosCompra;

  const feasible = in_.capitalDisponible >= desembolsoInicialCompra - 1;
  const precioMaxFinanciable =
    in_.capitalDisponible /
    (in_.entradaPorcentaje / 100 + gastosCompraPct / 100 || 1);
  const capital0 = Math.max(in_.capitalDisponible, desembolsoInicialCompra);

  let carteraCompra = capital0 - desembolsoInicialCompra;
  let carteraAlquiler = capital0;
  let baseCompra = carteraCompra;
  let baseAlquiler = carteraAlquiler;

  // Hipoteca (sistema francés; admite r = 0).
  const r = in_.tipoInteres / 100 / 12;
  const nMeses = in_.plazoHipotecaAnios * 12;
  const cuotaMensual =
    r === 0
      ? principalInicial / nMeses
      : (principalInicial * r * Math.pow(1 + r, nMeses)) /
        (Math.pow(1 + r, nMeses) - 1);

  let saldoVivo = principalInicial;
  let valorVivienda = in_.precioVivienda;

  const serie: RentVsBuyYear[] = [];
  let interesesTotales = 0;
  let tenenciaTotal = 0;
  let rentaTotal = 0;
  let principalTotal = 0;
  let irnrAcumulado = 0;

  const g = 1 + in_.rentabilidadInversionAnual / 100;
  // Vivienda habitual: ganancia exenta de IRPF (reinversión en otra habitual o
  // titular >65). Para inversión/2ª residencia, la ganancia tributa.
  const exenta = in_.viviendaHabitual;

  // ── 2) Bucle anual ──
  for (let t = 1; t <= N; t++) {
    // A) Amortización francesa mes a mes (separa interés / principal).
    let interesesAnio = 0;
    let principalAnio = 0;
    let saldo = saldoVivo;
    for (let mes = 1; mes <= 12; mes++) {
      if (saldo > 1e-6 && (t - 1) * 12 + mes <= nMeses) {
        const interesMes = saldo * r;
        let amortMes = r === 0 ? cuotaMensual : cuotaMensual - interesMes;
        amortMes = Math.min(amortMes, saldo);
        saldo -= amortMes;
        interesesAnio += interesMes;
        principalAnio += amortMes;
      }
    }
    saldoVivo = Math.max(saldo, 0);
    const cuotaAnualPagada = interesesAnio + principalAnio;

    // B) Costes de tenencia del comprador.
    const factorInfl = Math.pow(1 + in_.inflacionCostes / 100, t - 1);
    const ibi_t = in_.ibiAnual * factorInfl;
    const comunidad_t = in_.comunidadMensual * 12 * factorInfl;
    const seguro_t = in_.seguroHogarAnual * factorInfl;
    const mantenim_t = (valorVivienda * in_.mantenimientoPorcentaje) / 100;
    const costesTenencia_t = ibi_t + comunidad_t + seguro_t + mantenim_t;

    // C) Si tras mudarse alquila el piso a distancia (IRNR). Normalmente 0.
    let ingresoMudanza_t = 0;
    let irnr_t = 0;
    const hayMudanza = in_.aniosHastaMudanza > 0 && t > in_.aniosHastaMudanza;
    if (hayMudanza && in_.escenarioMudanza === 1) {
      const rentaPercibida_t =
        in_.alquilerMensual *
        12 *
        Math.pow(1 + in_.subidaAlquilerAnual / 100, t - 1);
      if (in_.paisDestinoFueraUE) {
        irnr_t = rentaPercibida_t * 0.24; // 24% sin deducir gastos
      } else {
        const base = Math.max(
          rentaPercibida_t - costesTenencia_t - interesesAnio,
          0
        );
        irnr_t = base * 0.19; // 19% deduciendo gastos (UE/EEE)
      }
      irnrAcumulado += irnr_t;
      ingresoMudanza_t =
        rentaPercibida_t - irnr_t - costesTenencia_t - cuotaAnualPagada;
    }

    // D) Desembolso de vivienda de cada escenario.
    const desembolsoCompra_t =
      cuotaAnualPagada + costesTenencia_t - Math.max(ingresoMudanza_t, 0);
    const alquiler_t =
      in_.alquilerMensual *
      12 *
      Math.pow(1 + in_.subidaAlquilerAnual / 100, t - 1);
    const seguroInq_t = in_.seguroInquilinoAnual * factorInfl;
    const desembolsoAlquiler_t = alquiler_t + seguroInq_t;

    // E) Neutralidad presupuestaria: invertir la diferencia.
    const presupuesto_t = Math.max(desembolsoCompra_t, desembolsoAlquiler_t);
    let aporteCompra_t = presupuesto_t - desembolsoCompra_t;
    const aporteAlquiler_t = presupuesto_t - desembolsoAlquiler_t;
    if (ingresoMudanza_t < 0) aporteCompra_t += ingresoMudanza_t;

    // F) Capitalización de carteras (mismo tipo) + base de coste.
    carteraCompra = Math.max(carteraCompra * g + aporteCompra_t, 0);
    carteraAlquiler = Math.max(carteraAlquiler * g + aporteAlquiler_t, 0);
    baseCompra += Math.max(aporteCompra_t, 0);
    baseAlquiler += Math.max(aporteAlquiler_t, 0);

    // G) Revalorización de la vivienda (cierre de año t).
    valorVivienda =
      in_.precioVivienda *
      Math.pow(1 + in_.revalorizacionViviendaAnual / 100, t);

    // H) Equity inmobiliaria neta y patrimonio liquidable.
    const costesVenta_t = (valorVivienda * in_.gastosVentaPorcentaje) / 100;
    const plusvMun_t =
      valorVivienda > in_.precioVivienda
        ? (valorVivienda * in_.plusvaliaMunicipalPorcentaje) / 100
        : 0;
    // Ganancia patrimonial IRPF: valor de transmisión (valor − gastos de venta,
    // que SÍ son deducibles) menos valor de adquisición (precio + gastos de compra).
    const gananciaVenta_t =
      valorVivienda - in_.precioVivienda - gastosCompra - costesVenta_t;
    const irpfVenta_t =
      gananciaVenta_t > 0 && !exenta ? tramosAhorro(gananciaVenta_t) : 0;
    const equityInmo_t =
      valorVivienda - saldoVivo - costesVenta_t - plusvMun_t - irpfVenta_t;

    const plusvAlq_t = Math.max(carteraAlquiler - baseAlquiler, 0);
    const plusvCmp_t = Math.max(carteraCompra - baseCompra, 0);
    const carteraAlqNeta_t = in_.liquidarCarteraAlFinal
      ? carteraAlquiler - tramosAhorro(plusvAlq_t)
      : carteraAlquiler;
    const carteraCmpNeta_t = in_.liquidarCarteraAlFinal
      ? carteraCompra - tramosAhorro(plusvCmp_t)
      : carteraCompra;

    const patrimonioCompra_t = equityInmo_t + carteraCmpNeta_t;
    const patrimonioAlquiler_t = carteraAlqNeta_t;

    interesesTotales += interesesAnio;
    tenenciaTotal += costesTenencia_t;
    rentaTotal += alquiler_t;
    principalTotal += principalAnio;

    serie.push({
      anio: t,
      cuotaAnual: round(cuotaAnualPagada),
      interesesAnio: round(interesesAnio),
      principalAnio: round(principalAnio),
      saldoVivo: round(saldoVivo),
      costesTenencia: round(costesTenencia_t),
      valorVivienda: round(valorVivienda),
      equityInmo: round(equityInmo_t),
      carteraCompra: round(carteraCmpNeta_t),
      alquilerAnual: round(alquiler_t),
      carteraAlquiler: round(carteraAlqNeta_t),
      patrimonioCompra: round(patrimonioCompra_t),
      patrimonioAlquiler: round(patrimonioAlquiler_t),
      diferencia: round(patrimonioCompra_t - patrimonioAlquiler_t),
      aporteCompra: round(aporteCompra_t),
      aporteAlquiler: round(aporteAlquiler_t),
      irnrAnio: round(irnr_t),
    });
  }

  // ── 3) Conversión a € de hoy (reales) ──
  if (in_.mostrarEnReales) {
    for (let t = 1; t <= N; t++) {
      const def = Math.pow(1 + in_.inflacionAnual / 100, t);
      const row = serie[t - 1];
      row.patrimonioCompra = round(row.patrimonioCompra / def);
      row.patrimonioAlquiler = round(row.patrimonioAlquiler / def);
      row.diferencia = row.patrimonioCompra - row.patrimonioAlquiler;
    }
  }

  // ── 4) Break-even (primer cruce de la diferencia de − a +) ──
  // Se calcula sobre la serie en la base elegida (real o nominal). Deflactar
  // escala ambas curvas por el mismo factor cada año, así que el signo de la
  // diferencia —y por tanto el break-even— es idéntico en € reales y nominales.
  let breakEvenAnios: number | null = null;
  if (serie.length > 0) {
    let deltaPrev = serie[0].patrimonioCompra - serie[0].patrimonioAlquiler;
    if (deltaPrev >= 0) {
      breakEvenAnios = 0;
    } else {
      for (let t = 2; t <= N; t++) {
        const d2 = serie[t - 1].patrimonioCompra - serie[t - 1].patrimonioAlquiler;
        if (deltaPrev < 0 && d2 >= 0) {
          const frac = -deltaPrev / (d2 - deltaPrev);
          breakEvenAnios = t - 1 + frac;
          break;
        }
        deltaPrev = d2;
      }
    }
  }

  // ── 5) Agregados y veredicto ──
  const last = serie[serie.length - 1];
  const patrimonioFinalCompra = last ? last.patrimonioCompra : 0;
  const patrimonioFinalAlquiler = last ? last.patrimonioAlquiler : 0;
  const ventajaCompra = patrimonioFinalCompra - patrimonioFinalAlquiler;
  const denom = Math.max(
    Math.abs(patrimonioFinalCompra),
    Math.abs(patrimonioFinalAlquiler),
    1
  );
  const ventajaPorcentual = (ventajaCompra / denom) * 100;
  const priceToRent =
    in_.alquilerMensual > 0
      ? in_.precioVivienda / (in_.alquilerMensual * 12)
      : null;

  const ganador: "comprar" | "alquilar" =
    breakEvenAnios != null && breakEvenAnios <= N ? "comprar" : "alquilar";
  const absPct = Math.abs(ventajaPorcentual);
  const banda: "empate" | "moderada" | "clara" =
    absPct < 5 ? "empate" : absPct < 20 ? "moderada" : "clara";

  // Override por movilidad (no cambia el número; cambia la recomendación mostrada).
  let overrideSubjetivo: "comprar" | "alquilar" | null = null;
  const mudanzaAntesEquilibrio =
    in_.aniosHastaMudanza > 0 &&
    breakEvenAnios != null &&
    in_.aniosHastaMudanza < breakEvenAnios;
  if (
    ganador === "comprar" &&
    (in_.probMudanzaExtranjero === 2 || mudanzaAntesEquilibrio)
  ) {
    overrideSubjetivo = "alquilar";
  }

  const baseLabel = in_.mostrarEnReales ? "€ de hoy" : "€ nominales";
  let resumen: string;
  if (banda === "empate") {
    resumen = `A ${N} años es prácticamente un empate técnico: ${eur(
      Math.abs(ventajaCompra)
    )} de diferencia (${baseLabel}). En lo financiero da casi igual; decide por tu estilo de vida y tu flexibilidad.`;
  } else {
    const ganaTxt = ganador === "comprar" ? "COMPRAR" : "ALQUILAR e invertir";
    const eqTxt =
      breakEvenAnios != null && breakEvenAnios > 0
        ? ` El punto de equilibrio llega en el año ${anios(
            breakEvenAnios
          )}: antes gana alquilar, después gana comprar.`
        : breakEvenAnios == null
        ? " Comprar no llega a alcanzar a alquilar dentro de tu horizonte."
        : "";
    resumen = `A ${N} años, ${ganaTxt} te deja ${eur(
      Math.abs(ventajaCompra)
    )} más de patrimonio neto (${
      ventajaPorcentual >= 0 ? "+" : "−"
    }${Math.abs(Math.round(ventajaPorcentual))}%, ventaja ${banda}, en ${baseLabel}).${eqTxt}`;
  }

  // ── 6) Avisos (factores subjetivos + validaciones blandas) ──
  const avisos = construirAvisos({
    in_,
    serie,
    breakEvenAnios,
    desembolsoInicialCompra,
    capital0,
    cuotaMensual,
    ganador,
    feasible,
    precioMaxFinanciable,
    overrideSubjetivo,
  });

  return {
    inputs: in_,
    serie,
    cuotaMensual: round(cuotaMensual),
    desembolsoInicialCompra: round(desembolsoInicialCompra),
    priceToRent: priceToRent != null ? Math.round(priceToRent * 10) / 10 : null,
    breakEvenAnios:
      breakEvenAnios != null ? Math.round(breakEvenAnios * 10) / 10 : null,
    patrimonioFinalCompra,
    patrimonioFinalAlquiler,
    ventajaCompra: round(ventajaCompra),
    ventajaPorcentual: Math.round(ventajaPorcentual * 10) / 10,
    veredicto: { ganador, banda, resumen, overrideSubjetivo },
    enReales: in_.mostrarEnReales,
    avisos,
    totales: {
      interesesTotales: round(interesesTotales),
      tenenciaTotal: round(tenenciaTotal),
      rentaTotal: round(rentaTotal),
      principalTotal: round(principalTotal),
      gastosCompra: round(gastosCompra),
      irnrAcumulado: round(irnrAcumulado),
    },
    feasible,
    precioMaxFinanciable: round(precioMaxFinanciable),
  };
}

function construirAvisos(ctx: {
  in_: RentVsBuyInput;
  serie: RentVsBuyYear[];
  breakEvenAnios: number | null;
  desembolsoInicialCompra: number;
  capital0: number;
  cuotaMensual: number;
  ganador: "comprar" | "alquilar";
  feasible: boolean;
  precioMaxFinanciable: number;
  overrideSubjetivo: "comprar" | "alquilar" | null;
}): RentVsBuyAviso[] {
  const {
    in_,
    breakEvenAnios,
    desembolsoInicialCompra,
    capital0,
    cuotaMensual,
    feasible,
    precioMaxFinanciable,
    overrideSubjetivo,
  } = ctx;
  const avisos: RentVsBuyAviso[] = [];

  if (!feasible) {
    const deficit = desembolsoInicialCompra - in_.capitalDisponible;
    avisos.push({
      clave: "entrada_insuficiente",
      severidad: "fuerte",
      sesgo: "neutral",
      mensaje: `Con tu ahorro no llegas a la entrada + gastos: te faltan ${eur(
        deficit
      )}. Con ${eur(in_.capitalDisponible)} podrías comprar hasta unos ${eur(
        precioMaxFinanciable
      )} (a ${in_.entradaPorcentaje}% de entrada), o subir la financiación. La simulación asume que reúnes el desembolso.`,
    });
  }

  if (overrideSubjetivo === "alquilar" || in_.probMudanzaExtranjero === 2) {
    const irnrTxt = in_.paisDestinoFueraUE
      ? "y, si lo alquilas a distancia desde fuera de la UE (p. ej. Suiza), la renta tributa al 24% por IRNR sin deducir gastos"
      : "y alquilarlo a distancia tributa por IRNR";
    avisos.push({
      clave: "movilidad",
      severidad: "fuerte",
      sesgo: "pro_alquilar",
      mensaje: `Tu movilidad pesa: si te vas antes del equilibrio no recuperas los gastos de comprar (~${in_.gastosCompraPorcentaje}%) y vender (~${in_.gastosVentaPorcentaje}%) ${irnrTxt}. Alquilar mantiene tu libertad de moverte.`,
    });
  }

  if (in_.horizonteAnios <= 3) {
    avisos.push({
      clave: "horizonte_corto",
      severidad: "fuerte",
      sesgo: "pro_alquilar",
      mensaje:
        "En horizontes tan cortos los costes de comprar y vender (un ~16% ida y vuelta) dominan y rara vez se recuperan. Alquilar suele ganar.",
    });
  }

  if (in_.subidaAlquilerAnual > 4) {
    avisos.push({
      clave: "supuesto_agresivo",
      severidad: "warning",
      sesgo: "pro_comprar",
      mensaje: `Asumir subidas del alquiler del ${in_.subidaAlquilerAnual}% favorece comprar; el índice de referencia histórico ronda el 2-3,5%.`,
    });
  }
  if (in_.revalorizacionViviendaAnual > 5) {
    avisos.push({
      clave: "supuesto_agresivo",
      severidad: "warning",
      sesgo: "pro_comprar",
      mensaje: `Una revalorización del ${in_.revalorizacionViviendaAnual}% anual es optimista y empuja el resultado hacia comprar. La vivienda también tiene ciclos de caída.`,
    });
  }
  if (in_.rentabilidadInversionAnual > 9) {
    avisos.push({
      clave: "supuesto_agresivo",
      severidad: "warning",
      sesgo: "pro_alquilar",
      mensaje: `Una rentabilidad de la cartera del ${in_.rentabilidadInversionAnual}% es alta y sostenida; empuja el resultado hacia alquilar e invertir.`,
    });
  }

  if (in_.entradaPorcentaje < 20) {
    avisos.push({
      clave: "supuesto_agresivo",
      severidad: "info",
      sesgo: "neutral",
      mensaje: `Una entrada por debajo del 20% (financiación >80%) es poco habitual en España y suele encarecer el tipo.`,
    });
  }

  const cuotaSobreIngreso = cuotaMensual / (in_.ingresoAnualNeto / 12);
  if (cuotaSobreIngreso > 0.35) {
    avisos.push({
      clave: "esfuerzo",
      severidad: "warning",
      sesgo: "pro_alquilar",
      mensaje: `La cuota sería el ${Math.round(
        cuotaSobreIngreso * 100
      )}% de tu ingreso mensual neto; por encima del 35% el esfuerzo se considera alto.`,
    });
  }

  const colchonTrasCompra = capital0 - desembolsoInicialCompra;
  if (in_.liquidezNecesaria > colchonTrasCompra) {
    avisos.push({
      clave: "liquidez",
      severidad: "warning",
      sesgo: "pro_alquilar",
      mensaje: `Comprar inmoviliza tu capital: te quedarías con ${eur(
        Math.max(colchonTrasCompra, 0)
      )} líquidos, por debajo del colchón de ${eur(
        in_.liquidezNecesaria
      )} que quieres mantener.`,
    });
  }

  if (in_.estabilidadLaboral === 0) {
    avisos.push({
      clave: "estabilidad",
      severidad: "warning",
      sesgo: "pro_alquilar",
      mensaje:
        "Con ingresos inciertos, atarte a una cuota fija muchos años es arriesgado; el alquiler es reversible.",
    });
  }

  if (in_.crecimientoSalarialEsperado >= 20) {
    avisos.push({
      clave: "salario",
      severidad: "info",
      sesgo: "pro_alquilar",
      mensaje: `Si esperas un salto salarial del ${in_.crecimientoSalarialEsperado}%, quizá compense alquilar ahora y comprar en mejores condiciones (más entrada, mejor hipoteca) dentro de 1-2 años.`,
    });
  }

  if (
    in_.aniosHastaMudanza > 0 &&
    breakEvenAnios != null &&
    in_.aniosHastaMudanza < breakEvenAnios
  ) {
    avisos.push({
      clave: "movilidad",
      severidad: "warning",
      sesgo: "pro_alquilar",
      mensaje: `Tu mudanza (año ${in_.aniosHastaMudanza}) llega antes del equilibrio (año ${anios(
        breakEvenAnios
      )}): venderías sin haber recuperado los costes de la compra.`,
    });
  }

  return avisos;
}
