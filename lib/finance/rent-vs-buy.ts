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
 *  - El veredicto compara el patrimonio al horizonte elegido.
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

/** Supuestos ilustrativos editables: no son observaciones ni previsiones validadas. */
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
  gastosInicialesCompra: 0,
  gestionCompraAnual: 0,
  gastosVentaPorcentaje: 6,
  plusvaliaMunicipalPorcentaje: 0.5,
  ibiAnual: 900,
  comunidadMensual: 120,
  seguroHogarAnual: 300,
  mantenimientoPorcentaje: 1,
  revalorizacionViviendaAnual: 4,
  inflacionCostes: 2,
  viviendaHabitual: true,
  exencionGananciaVenta: false,
  // Alquiler
  subidaAlquilerAnual: 4,
  seguroInquilinoAnual: 0,
  gastosInicialesAlquiler: 0,
  gestionAlquilerAnual: 0,
  // Personal
  probMudanzaExtranjero: 0,
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
  { campo: "precioVivienda", etiqueta: "Precio de la vivienda", unidad: "EUR", min: 50000, max: 3000000, step: 5000, avanzado: false, grupo: "compra", nota: "Precio total antes de impuestos y otros gastos. Compara una vivienda equivalente a la del alquiler." },
  { campo: "alquilerMensual", etiqueta: "Alquiler de un piso equivalente", unidad: "EUR/mes", min: 300, max: 10000, step: 25, avanzado: false, grupo: "alquiler", nota: "Clave: el alquiler de una vivienda comparable a la de compra, no tu alquiler actual de algo más pequeño." },
  { campo: "capitalDisponible", etiqueta: "Ahorro disponible hoy", unidad: "EUR", min: 0, max: 4500000, step: 5000, avanzado: false, grupo: "comun", nota: "Mismo capital inicial para las dos alternativas. Los gastos iniciales se descuentan antes de invertir el resto." },
  { campo: "horizonteAnios", etiqueta: "Años de comparación desde hoy", unidad: "años", min: 1, max: 40, step: 1, avanzado: false, grupo: "comun", nota: "Ambas opciones comienzan hoy. Al final de cada año valoramos qué patrimonio tendrías si liquidaras vivienda y cartera." },
  { campo: "entradaPorcentaje", etiqueta: "Entrada", unidad: "%", min: 0, max: 100, step: 1, avanzado: false, grupo: "compra", nota: "Parte del precio que aportas con tus ahorros; el resto se financia. No incluye impuestos ni otros gastos." },
  { campo: "tipoInteres", etiqueta: "Tipo de interés (TIN fijo)", unidad: "%", min: 0, max: 12, step: 0.1, avanzado: false, grupo: "compra", nota: "Supuesto editable de interés fijo; no es una oferta bancaria." },
  { campo: "plazoHipotecaAnios", etiqueta: "Plazo de la hipoteca", unidad: "años", min: 5, max: 40, step: 1, avanzado: false, grupo: "compra", nota: "Si el plazo es menor que tu horizonte, al terminar la hipoteca el dinero de la cuota pasa a invertirse." },
  { campo: "rentabilidadInversionAnual", etiqueta: "Rentabilidad de tus inversiones", unidad: "%", min: 0, max: 12, step: 0.5, avanzado: false, grupo: "comun", nota: "Rentabilidad bruta esperada de la cartera. La misma en ambos escenarios (el mercado no paga más por alquilar)." },
  { campo: "revalorizacionViviendaAnual", etiqueta: "Revalorización de la vivienda", unidad: "%", min: -5, max: 12, step: 0.5, avanzado: false, grupo: "compra", nota: "Distinta de la rentabilidad de la cartera. La vivienda en Madrid tiene ciclos, también caídas." },
  { campo: "subidaAlquilerAnual", etiqueta: "Subida anual del alquiler", unidad: "%", min: 0, max: 10, step: 0.5, avanzado: false, grupo: "alquiler", nota: "Escenario de crecimiento de la renta comparable, no una previsión ni el límite legal de actualización de tu contrato." },

  { campo: "gastosInicialesCompra", etiqueta: "Otros gastos iniciales de compra", unidad: "EUR", min: 0, max: 500000, step: 100, avanzado: false, grupo: "compra", nota: "Muebles, mudanza y equipamiento pagados al empezar. Se descuentan una sola vez; se supone valor de reventa cero. No incluyas trámites ya contados ni reformas que quieras capitalizar." },
  { campo: "gastosInicialesAlquiler", etiqueta: "Otros gastos iniciales de alquiler", unidad: "EUR", min: 0, max: 500000, step: 100, avanzado: false, grupo: "alquiler", nota: "Muebles, mudanza y equipamiento al empezar; valor de reventa cero. Excluye fianzas recuperables, que este modelo no inmoviliza." },
  { campo: "gestionCompraAnual", etiqueta: "Gestión y otros costes anuales", unidad: "EUR/año", min: 0, max: 50000, step: 100, avanzado: true, grupo: "compra", nota: "Servicios recurrentes propios de la compra que no estén ya en comunidad, seguro o mantenimiento. La gestoría inicial va en impuestos y trámites." },
  { campo: "gestionAlquilerAnual", etiqueta: "Otros costes anuales del inquilino", unidad: "EUR/año", min: 0, max: 50000, step: 100, avanzado: true, grupo: "alquiler", nota: "Servicios voluntarios o gastos propios distintos de renta y seguro. En alquiler de vivienda, la gestión inmobiliaria y formalización del contrato corresponden al arrendador (art. 20 LAU); no los cargues aquí." },

  // Avanzados — compra
  { campo: "esObraNueva", etiqueta: "Obra nueva", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "compra", nota: "En general: segunda mano paga ITP; primera entrega de vivienda nueva paga IVA y AJD. Al cambiarlo proponemos un gasto total editable. Consulta el desglose y las fuentes en el glosario." },
  { campo: "gastosCompraPorcentaje", etiqueta: "Impuestos y trámites de compra", unidad: "%", min: 0, max: 25, step: 0.5, avanzado: true, grupo: "compra", nota: "Porcentaje TOTAL del precio: incluye ITP o IVA/AJD, notaría, registro, gestoría y tasación. No sumamos impuestos otra vez. Estimación editable; 10% es un ejemplo, no una tarifa." },
  { campo: "gastosVentaPorcentaje", etiqueta: "Gastos de una venta hipotética", unidad: "%", min: 0, max: 10, step: 0.5, avanzado: true, grupo: "compra", nota: "Agencia y otros costes de vender al final de cada año, como cancelación registral. IRPF de la ganancia y plusvalía municipal se calculan aparte." },
  { campo: "plusvaliaMunicipalPorcentaje", etiqueta: "Plusvalía municipal (estimada)", unidad: "%", min: 0, max: 3, step: 0.1, avanzado: true, grupo: "compra", nota: "Aproximación editable sobre el precio final, no cálculo tributario: faltan valor del suelo, municipio y fechas. El modelo la fija en cero si no sube el precio." },
  { campo: "ibiAnual", etiqueta: "IBI anual", unidad: "EUR/año", min: 0, max: 10000, step: 50, avanzado: true, grupo: "compra", nota: "Importe del recibo de un año completo. Es un impuesto municipal anual basado en el valor catastral; no se estima a partir del precio de venta." },
  { campo: "comunidadMensual", etiqueta: "Gastos de comunidad", unidad: "EUR/mes", min: 0, max: 1000, step: 10, avanzado: true, grupo: "compra", nota: "Cuota mensual para los gastos comunes del edificio. Añade derramas previstas en mantenimiento u otros costes sin duplicarlas." },
  { campo: "seguroHogarAnual", etiqueta: "Seguro de hogar", unidad: "EUR/año", min: 0, max: 3000, step: 25, avanzado: true, grupo: "compra", nota: "Prima anual del seguro elegido. Consulta las coberturas y condiciones exigidas por tu préstamo." },
  { campo: "mantenimientoPorcentaje", etiqueta: "Mantenimiento anual (% del precio)", unidad: "%", min: 0, max: 3, step: 0.1, avanzado: true, grupo: "compra", nota: "El 1% inicial es solo un supuesto editable: precio de compra × porcentaje cada año, actualizado con la inflación de gastos. Usa presupuestos de reparaciones; no es una media validada." },
  { campo: "exencionGananciaVenta", etiqueta: "Simular exención de la ganancia", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "compra", nota: "Simula no pagar IRPF por la ganancia de la venta hipotética. Solo tiene efecto si marcas también vivienda habitual. No elimina gastos de venta, plusvalía municipal ni impuestos de la cartera. Comprueba los requisitos de exención en el glosario." },
  { campo: "viviendaHabitual", etiqueta: "Es tu vivienda habitual", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "compra", nota: "Si es tu residencia habitual, puedes combinar esta opción con la exención simulada. Por sí sola no cambia el resultado: con la exención desactivada se calcula IRPF sobre la ganancia. Si no es habitual, el simulador no aplica esa exención." },

  // Avanzados — alquiler / comunes
  { campo: "seguroInquilinoAnual", etiqueta: "Seguro del inquilino", unidad: "EUR/año", min: 0, max: 500, step: 10, avanzado: true, grupo: "alquiler", nota: "Opcional." },
  { campo: "inflacionAnual", etiqueta: "Inflación general (IPC)", unidad: "%", min: 0, max: 8, step: 0.1, avanzado: true, grupo: "comun", nota: "Para mostrar el patrimonio en € de hoy (reales)." },
  { campo: "inflacionCostes", etiqueta: "Subida anual de gastos recurrentes", unidad: "%", min: 0, max: 8, step: 0.1, avanzado: true, grupo: "compra", nota: "Actualiza IBI, comunidad, seguros, mantenimiento y otros costes anuales. Es independiente de la inflación general, la revalorización del inmueble y la subida del alquiler." },

  // Personal / subjetivo
  { campo: "probMudanzaExtranjero", etiqueta: "Probabilidad de mudarte al extranjero", unidad: "enum", min: 0, max: 2, avanzado: false, grupo: "personal", nota: "Si es alta, vender o alquilar a distancia puede comerse la ventaja de comprar.", opciones: ["Baja", "Media", "Alta"] },
  { campo: "aniosHastaMudanza", etiqueta: "Años hasta la mudanza prevista", unidad: "años", min: 0, max: 40, step: 1, avanzado: true, grupo: "personal", nota: "Campo legado: genera un aviso; no ejecuta una venta ni alquila la vivienda a terceros." },
  { campo: "paisDestinoFueraUE", etiqueta: "Destino fuera de la UE (ej. Suiza)", unidad: "boolean", min: 0, max: 1, avanzado: true, grupo: "personal", nota: "Campo legado sin efecto financiero: la comparación base no simula cambios de residencia fiscal ni IRNR." },
  { campo: "liquidezNecesaria", etiqueta: "Colchón de liquidez a mantener", unidad: "EUR", min: 0, max: 4500000, step: 5000, avanzado: false, grupo: "personal", nota: "Si comprar te deja por debajo de este colchón, te avisamos." },
  { campo: "estabilidadLaboral", etiqueta: "Estabilidad laboral", unidad: "enum", min: 0, max: 2, avanzado: false, grupo: "personal", nota: "Atarse a una cuota fija con ingresos inciertos es arriesgado.", opciones: ["Baja", "Media", "Alta"] },
  { campo: "crecimientoSalarialEsperado", etiqueta: "Aumento salarial total esperado", unidad: "%", min: 0, max: 300, step: 5, avanzado: true, grupo: "personal", nota: "Aumento total esperado en los próximos 1–2 años, hasta el 300%; no es una tasa anual. Solo informa avisos y no se suma al patrimonio simulado." },
  { campo: "ingresoAnualNeto", etiqueta: "Ingreso anual neto actual", unidad: "EUR/año", min: 12000, max: 500000, step: 1000, avanzado: true, grupo: "personal", nota: "Solo para avisos de esfuerzo de la cuota. No entra en el cálculo de patrimonio." },
];

/** Escala conjunta del ahorro IRPF 2025, mantenida constante como supuesto.
 * AEAT: manual IRPF 2025, gravamen estatal y autonómico. Sin otras rentas,
 * pérdidas compensables ni mínimos personales. g = ganancia (>0). */
function tramosAhorro(g: number): number {
  if (g <= 0) return 0;
  const tramos: Array<[number, number]> = [
    [6000, 0.19], // 0 – 6.000
    [44000, 0.21], // 6.000 – 50.000
    [150000, 0.23], // 50.000 – 200.000
    [100000, 0.27], // 200.000 – 300.000
    [Infinity, 0.30], // > 300.000
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
    const defaultValue = k === "gastosCompraPorcentaje" && input.esObraNueva === true ? 11.5 : d[k];
    const v = raw === undefined ? (defaultValue as number) : Number(raw);
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
    gastosInicialesCompra: get("gastosInicialesCompra"),
    gastosInicialesAlquiler: get("gastosInicialesAlquiler"),
    gestionCompraAnual: get("gestionCompraAnual"),
    gestionAlquilerAnual: get("gestionAlquilerAnual"),
    gastosVentaPorcentaje: get("gastosVentaPorcentaje"),
    plusvaliaMunicipalPorcentaje: get("plusvaliaMunicipalPorcentaje"),
    ibiAnual: get("ibiAnual"),
    comunidadMensual: get("comunidadMensual"),
    seguroHogarAnual: get("seguroHogarAnual"),
    mantenimientoPorcentaje: get("mantenimientoPorcentaje"),
    revalorizacionViviendaAnual: get("revalorizacionViviendaAnual"),
    inflacionCostes: get("inflacionCostes"),
    viviendaHabitual: get("viviendaHabitual") === 1,
    exencionGananciaVenta: get("exencionGananciaVenta") === 1,
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
  // El porcentaje mostrado es el aplicado: sin mínimos ocultos ni doble IVA/ITP.
  const gastosCompraPct = in_.gastosCompraPorcentaje;
  const gastosCompra = (in_.precioVivienda * gastosCompraPct) / 100;
  const gastosInicialesCompra = in_.gastosInicialesCompra ?? 0;
  const gastosInicialesAlquiler = in_.gastosInicialesAlquiler ?? 0;
  const desembolsoInicialCompra = entrada + gastosCompra + gastosInicialesCompra;

  const feasible = in_.capitalDisponible >= desembolsoInicialCompra - 1;
  const fraccionInicial = (in_.entradaPorcentaje + gastosCompraPct) / 100;
  const precioMaxFinanciable = fraccionInicial > 0
    ? Math.max(in_.capitalDisponible - gastosInicialesCompra, 0) / fraccionInicial
    : in_.capitalDisponible >= gastosInicialesCompra
      ? RENT_VS_BUY_FIELDS.find((field) => field.campo === "precioVivienda")!.max
      : 0;
  const capital0 = Math.max(in_.capitalDisponible, desembolsoInicialCompra, gastosInicialesAlquiler);

  let carteraCompra = capital0 - desembolsoInicialCompra;
  let carteraAlquiler = capital0 - gastosInicialesAlquiler;
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
  let segurosAlquilerTotal = 0;
  let gestionAlquilerTotal = 0;
  let costesVentaFinal = 0;
  let impuestoVentaFinal = 0;
  let plusvaliaMunicipalFinal = 0;

  const g = 1 + in_.rentabilidadInversionAnual / 100;
  // Ser vivienda habitual no basta: solo se aplica exención cuando el usuario
  // activa explícitamente el supuesto fiscal adicional.
  const exenta = in_.viviendaHabitual && in_.exencionGananciaVenta === true;

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
    const mantenim_t = (in_.precioVivienda * in_.mantenimientoPorcentaje) / 100 * factorInfl;
    const gestionCompra_t = (in_.gestionCompraAnual ?? 0) * factorInfl;
    const costesTenencia_t = ibi_t + comunidad_t + seguro_t + mantenim_t + gestionCompra_t;

    // C) Comparación base desde hoy. No se modela una segunda vivienda,
    // una venta intermedia ni la residencia fiscal de una mudanza.
    const desembolsoCompra_t = cuotaAnualPagada + costesTenencia_t;
    const alquiler_t =
      in_.alquilerMensual *
      12 *
      Math.pow(1 + in_.subidaAlquilerAnual / 100, t - 1);
    const seguroInq_t = in_.seguroInquilinoAnual * factorInfl;
    const gestionAlquiler_t = (in_.gestionAlquilerAnual ?? 0) * factorInfl;
    const desembolsoAlquiler_t = alquiler_t + seguroInq_t + gestionAlquiler_t;

    // E) Neutralidad presupuestaria: invertir la diferencia.
    const presupuesto_t = Math.max(desembolsoCompra_t, desembolsoAlquiler_t);
    const aporteCompra_t = presupuesto_t - desembolsoCompra_t;
    const aporteAlquiler_t = presupuesto_t - desembolsoAlquiler_t;

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
    // que SÍ son deducibles) menos valor de adquisición (precio + gastos de compra). La plusvalía municipal satisfecha también
    // reduce el valor de transmisión; muebles/mudanza no aumentan la base fiscal.
    const gananciaVenta_t =
      valorVivienda - in_.precioVivienda - gastosCompra - costesVenta_t - plusvMun_t;
    const irpfVenta_t =
      gananciaVenta_t > 0 && !exenta ? tramosAhorro(gananciaVenta_t) : 0;
    const equityInmo_t =
      valorVivienda - saldoVivo - costesVenta_t - plusvMun_t - irpfVenta_t;

    const plusvAlq_t = Math.max(carteraAlquiler - baseAlquiler, 0);
    const plusvCmp_t = Math.max(carteraCompra - baseCompra, 0);
    const carteraAlqNeta_t = in_.liquidarCarteraAlFinal
      ? carteraAlquiler - tramosAhorro(plusvAlq_t)
      : carteraAlquiler;
    // Venta y cartera del mismo titular comparten escala del ahorro al liquidar.
    const baseVenta = exenta ? 0 : Math.max(gananciaVenta_t, 0);
    const impuestoCarteraCompra = tramosAhorro(baseVenta + plusvCmp_t) - tramosAhorro(baseVenta);
    const carteraCmpNeta_t = in_.liquidarCarteraAlFinal
      ? carteraCompra - impuestoCarteraCompra
      : carteraCompra;
    costesVentaFinal = costesVenta_t;
    impuestoVentaFinal = irpfVenta_t;
    plusvaliaMunicipalFinal = plusvMun_t;

    const patrimonioCompra_t = equityInmo_t + carteraCmpNeta_t;
    const patrimonioAlquiler_t = carteraAlqNeta_t;

    interesesTotales += interesesAnio;
    tenenciaTotal += costesTenencia_t;
    rentaTotal += alquiler_t;
    segurosAlquilerTotal += seguroInq_t;
    gestionAlquilerTotal += gestionAlquiler_t;
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
      irnrAnio: 0, // Campo legado; no hay subescenario de no residentes.
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
      breakEvenAnios = 1; // Primera observación: cierre del año 1; no se estima un cruce en t=0.
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
    ventajaCompra >= 0 ? "comprar" : "alquilar";
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
          )}. Es el primer cruce; las curvas pueden volver a cruzarse.`
        : breakEvenAnios == null
        ? " Comprar no llega a alcanzar a alquilar dentro de tu horizonte."
        : "";
    resumen = `A ${N} años, ${ganaTxt} te deja ${eur(
      Math.abs(ventajaCompra)
    )} más de patrimonio neto (${
      Math.abs(Math.round(ventajaPorcentual))
    }% de diferencia, ventaja ${banda}, en ${baseLabel}).${eqTxt}`;
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
      irnrAcumulado: 0,
      gastosInicialesCompra: round(gastosInicialesCompra),
      gastosInicialesAlquiler: round(gastosInicialesAlquiler),
      segurosAlquilerTotal: round(segurosAlquilerTotal),
      gestionAlquilerTotal: round(gestionAlquilerTotal),
      costesVentaFinal: round(costesVentaFinal),
      impuestoVentaFinal: round(impuestoVentaFinal),
      plusvaliaMunicipalFinal: round(plusvaliaMunicipalFinal),
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
    desembolsoInicialCompra,
    capital0,
    cuotaMensual,
    feasible,
    precioMaxFinanciable,
    overrideSubjetivo,
  } = ctx;
  const avisos: RentVsBuyAviso[] = [];

  if (in_.capitalDisponible < (in_.gastosInicialesAlquiler ?? 0)) {
    avisos.push({ clave: "liquidez", severidad: "fuerte", sesgo: "neutral", mensaje: `Los gastos iniciales del alquiler superan tu ahorro. La comparación supone que ambas alternativas reúnen ${eur(capital0)} de capital inicial; reduce los gastos o ajusta el ahorro para evaluar un caso financiable.` });
  }

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
      )} (a ${in_.entradaPorcentaje}% de entrada), o subir la financiación. La simulación asume que ambas alternativas reúnen ${eur(capital0)} de capital inicial.`,
    });
  }

  if (overrideSubjetivo === "alquilar" || in_.probMudanzaExtranjero === 2) {
    avisos.push({
      clave: "movilidad",
      severidad: "fuerte",
      sesgo: "pro_alquilar",
      mensaje: "Si prevés mudarte, valora la flexibilidad del alquiler y los trámites de vender o gestionar una vivienda. Es un aviso cualitativo: no modifica el patrimonio calculado ni simula la fiscalidad de otro país.",
    });
  }

  if (in_.horizonteAnios <= 3) {
    avisos.push({
      clave: "horizonte_corto",
      severidad: "fuerte",
      sesgo: "pro_alquilar",
      mensaje:
        "En horizontes tan cortos los costes de comprar y vender (los importes de compra y venta que has introducido) dominan y rara vez se recuperan. Alquilar suele ganar.",
    });
  }

  if (in_.subidaAlquilerAnual > 4) {
    avisos.push({
      clave: "supuesto_agresivo",
      severidad: "warning",
      sesgo: "pro_comprar",
      mensaje: `Asumir subidas sostenidas del alquiler del ${in_.subidaAlquilerAnual}% favorece comprar. Es un escenario; no predice la renta ni el límite legal aplicable a tu contrato.`,
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

  if (in_.aniosHastaMudanza > 0) {
    avisos.push({
      clave: "movilidad",
      severidad: "info",
      sesgo: "neutral",
      mensaje: `Has indicado una mudanza en el año ${in_.aniosHastaMudanza}. Este motor compara comprar y alquilar desde hoy durante todo el horizonte; no ejecuta una venta intermedia, no cobra rentas a terceros y no calcula IRNR. Ajusta los años de comparación si solo quieres valorar la situación antes de mudarte.`,
    });
  }

  return avisos;
}
