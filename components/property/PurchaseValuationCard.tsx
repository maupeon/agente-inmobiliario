import type { PurchaseValuation } from "@/types";
import { formatNumber } from "@/lib/utils";
import { precioEstimado } from "@/lib/valoracion/types";
const LABELS: Record<string, string> = {
  CONSTRUCTEDAREA: "Superficie", ROOMNUMBER: "Habitaciones", BATHNUMBER: "Baños", FLOORCLEAN: "Planta", HASLIFT: "Ascensor", barrio: "Barrio aproximado", distrito: "Distrito aproximado", x_km: "Localización", y_km: "Localización", LATITUDE: "Latitud", LONGITUDE: "Longitud", DISTANCE_TO_CITY_CENTER: "Distancia al centro", DISTANCE_TO_METRO: "Distancia de referencia al metro", CADASTRALQUALITYID: "Calidad catastral de referencia", alq_mediana_eur_m2: "Referencia histórica de alquiler", m2_por_habitacion: "Superficie por habitación", antiguedad: "Antigüedad de referencia", ISSTUDIO: "Estudio", ISDUPLEX: "Dúplex", FLATLOCATIONID_cat: "Interior/exterior", ratio_planta: "Planta relativa" };
export function PurchaseValuationCard({ data }: { data: PurchaseValuation }) {
  const v = data.resultado;
  return <section className="my-4 rounded-xl border border-hairline bg-paper-50 p-5">
    <h3 className="font-display text-xl">Precio de oferta · modelo HabitIA</h3>
    <p className="mt-1 text-xs text-stone-600">Anuncio {data.propertyCode}{data.sourceKind === "demo" ? " · datos ficticios de demostración" : ""}</p>
    {v && <><p className="mt-3 text-2xl">{formatNumber(Math.round(precioEstimado(v)))} €</p>
      {v.intervalo ? <p className="mt-1 text-sm">Intervalo del escenario: {formatNumber(v.intervalo[0])}–{formatNumber(v.intervalo[1])} €</p>
        : <p className="mt-1 text-sm">Estimación puntual · sin intervalo calibrado</p>}
      {v.brecha_pct != null && <p className="mt-2 text-sm">Anuncio {Math.abs(v.brecha_pct).toFixed(1)} % {v.brecha_pct < 0 ? "por debajo" : "por encima"} de la estimación.</p>}
      <p className="mt-2 text-xs text-stone-600">Entrenado con oferta de 2018 · escenario indexado a {v.nivel_precios} · {v.model_version}</p></>}
    {v?.model_id === "habitIA-xgboost-2018-v3" && <p className="mt-3 text-sm text-stone-600">Escenario de renta: {formatNumber(Math.round(v.renta_mensual_estimada))} €/mes, derivado de ratios distritales de {v.ano_renta}. Alquiler no validado.</p>}
    {!!v?.advertencias.length && <details className="mt-3 text-xs leading-relaxed text-stone-600">
      <summary className="cursor-pointer">Datos utilizados y límites de la estimación</summary>
      <ul className="mt-2 list-disc space-y-1 pl-4">{v.advertencias.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </details>}
    {v?.explicacion && <div className="mt-4 border-t border-hairline pt-3">
      <p className="text-sm font-medium">Qué ha influido más en esta estimación</p>
      <ul className="mt-2 text-sm">{v.explicacion.factores.slice(0, 3).map((f) => <li key={f.variable}>{LABELS[f.variable] ?? f.variable}: contribución {f.sentido === "aumenta" ? "positiva" : "negativa"}</li>)}</ul>
      <p className="mt-2 text-xs text-stone-600">Atribuciones del modelo respecto a su predicción base, en escala logarítmica. Explican el cálculo; no son efectos causales ni importes en euros.</p>
    </div>}
    <p className="mt-3 text-sm leading-relaxed text-stone-600">{data.aviso} La brecha indica una desviación del modelo; no acredita una oportunidad de inversión.</p>
  </section>;
}
