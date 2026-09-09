import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { getMarketData } from "@/lib/market/cache";
import { formatMarketPeriod, MARKET_SOURCES } from "@/lib/market/presentation";
import { formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Datos y fuentes",
  description:
    "Consulta los datos que usa HabitIA para comparar viviendas, sus fuentes y cuándo se actualizaron.",
};

// Siempre refleja el estado actual de la caché (no se prerenderiza).
export const dynamic = "force-dynamic";

type Estado = "real" | "orientativo";

export default async function DatosPage() {
  const [price, ipv, bde] = await Promise.all([
    getMarketData("ine_price_by_province"),
    getMarketData("ine_ipv_quarterly"),
    getMarketData("bde_mortgage_rates"),
  ]);

  const freshness = (updatedAt: string | null, fromFallback: boolean) =>
    fromFallback || !updatedAt ? "sin actualización verificada" : `consultado ${timeAgo(updatedAt)}`;

  return (
    <div className="relative z-10">
      <SiteNav />
      <main className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-10 sm:px-8">
        <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
          <span>Datos</span>
          <span className="hidden sm:inline">Fuente · Periodo · Límites</span>
          <span className="tabular text-stone">№ 003</span>
        </div>

        <header className="mt-10 max-w-[62ch]">
          <h1 className="font-display text-display-md text-ink">De dónde sale cada dato</h1>
          <p className="mt-4 text-lg leading-relaxed text-stone-600">
            Consulta las referencias de mercado y abre su publicación original.
            La fecha de consulta indica cuándo recuperamos el dato; el periodo
            indica qué momento describe. Si solo hay ejemplos o una copia sin
            procedencia verificada, lo señalamos y no mostramos sus cifras como referencia.
          </p>
        </header>

        {/* Precio €/m² compra por provincia */}
        <DataCard
          title="Compra · valor tasado medio por provincia"
          estado={price.fromFallback ? "orientativo" : "real"}
          fuente={price.data.fuente}
          sourceLink={MARKET_SOURCES.valuation}
          meta={price.fromFallback ? "Sin referencia verificada disponible" : `${price.data.data.length} provincias · ${formatMarketPeriod(price.data.periodo)} · ${freshness(price.updatedAt, false)}`}
        >
          <p className="mb-4 text-sm leading-relaxed text-stone-600">Es una media de tasaciones de vivienda libre, expresada en €/m². Sirve para dar contexto territorial; no determina por sí sola cuánto vale un piso concreto ni su HabitIA Score.</p>
          {price.fromFallback ? <Unavailable /> : (
          <Collapsible summary={`Ver las ${price.data.data.length} provincias`}>
            <Table head={["Provincia", "€/m²", "Var. anual"]}>
              {[...price.data.data]
                .sort((a, b) => b.precioM2 - a.precioM2)
                .map((p) => (
                  <Row key={p.provincia} cells={[p.provincia, `${formatNumber(p.precioM2)} €`, p.variacionInteranual != null ? `${p.variacionInteranual > 0 ? "+" : ""}${p.variacionInteranual}%` : "—"]} />
                ))}
            </Table>
          </Collapsible>
          )}
        </DataCard>

        {/* IPV */}
        <DataCard
          title="Tendencia de precios · IPV (variación interanual)"
          estado={ipv.fromFallback ? "orientativo" : "real"}
          fuente={ipv.data.fuente}
          sourceLink={MARKET_SOURCES.ipv}
          meta={ipv.fromFallback ? "Sin serie verificada disponible" : `${ipv.data.serie.length} trimestres · ${freshness(ipv.updatedAt, false)}`}
        >
          <p className="mb-4 text-sm leading-relaxed text-stone-600">El IPV describe cómo cambian los precios de compraventa. Una variación interanual compara con el mismo trimestre del año anterior. Q1 = enero–marzo; Q2 = abril–junio; Q3 = julio–septiembre; Q4 = octubre–diciembre.</p>
          {ipv.fromFallback ? <Unavailable /> : (
          <Table head={["Trimestre", "Variación interanual"]}>
            {ipv.data.serie.map((q) => (
              <Row key={q.periodo} cells={[formatMarketPeriod(q.periodo), `${q.variacionInteranual > 0 ? "+" : ""}${q.variacionInteranual}%`]} />
            ))}
          </Table>
          )}
        </DataCard>

        {/* Tipos hipoteca */}
        <DataCard
          title="Financiación · tipos hipotecarios"
          estado={bde.fromFallback ? "orientativo" : "real"}
          fuente={bde.data.fuente}
          sourceLink={MARKET_SOURCES.rates}
          meta={bde.fromFallback ? "Sin tipos verificados disponibles" : `${formatMarketPeriod(bde.data.periodo)} · ${freshness(bde.updatedAt, false)}`}
        >
          <p className="mb-4 text-sm leading-relaxed text-stone-600">Son referencias agregadas del mercado. Para comparar comprar y alquilar, introduce las condiciones que te ofrece tu banco.</p>
          {bde.fromFallback ? <Unavailable /> : (
          <Table head={["Indicador", "Valor", "Periodo"]}>
            <Row cells={["Crédito vivienda · tipo medio TEDR", `${bde.data.tipoMedio}%`, bde.data.periodo]} />
            <Row cells={["Euríbor 12 meses", bde.data.euribor12m != null ? `${bde.data.euribor12m}%` : "—", bde.data.euriborPeriodo ?? "Sin periodo individual"]} />
          </Table>
          )}
        </DataCard>

        {/* Alquiler referencia */}
        <DataCard
          title="Alquiler · origen y uso de la referencia"
          estado="orientativo"
          fuente="Los valores locales son ejemplos manuales sin validación documental."
          sourceLink={MARKET_SOURCES.rent}
          meta="Integración de una referencia oficial pendiente"
        >
          <div className="space-y-3 text-sm leading-relaxed text-stone-600">
            <p><Strong>¿De dónde salía?</Strong> De una tabla de ejemplos escrita para la demo. No es una descarga de SERPAVI ni una muestra contrastada de anuncios; no puede atribuirse al Ministerio.</p>
            <p><Strong>¿Para qué serviría?</Strong> Una referencia contrastada permitiría comparar el alquiler mensual por m² del anuncio con viviendas de un ámbito y periodo conocidos. El SERPAVI oficial utiliza información tributaria sobre arrendamientos; su metodología se enlaza arriba para consulta, pero aún no alimenta esta aplicación.</p>
            <p><Strong>¿Qué ocurre ahora?</Strong> Las fichas muestran «sin referencia verificada». Los ejemplos no clasifican un alquiler como barato o caro y no aportan puntos a Fair ni a Opportunity. El ranking puede usar ubicación, presupuesto, trayecto y requisitos disponibles.</p>
          </div>
        </DataCard>

        <section className="mt-8 rounded-xl border border-hairline bg-paper-50 p-5">
          <h2 className="font-display text-xl">Indicadores de barrio</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">Los índices manuales de seguridad y calidad de vida se han retirado porque no disponemos de una fuente verificable a esa escala. No hay una puntuación de «barrio seguro» ni una capa de seguridad.</p>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">El componente <Strong>Zone</Strong> del HabitIA Score mide la proximidad a la ubicación que tú has elegido. Es una preferencia personal, no una estadística de seguridad, servicios o calidad del barrio. La referencia territorial de precio es otro dato distinto: una media del ámbito indicado en la ficha.</p>
        </section>

        {/* Otras fuentes no tabulares */}
        <section className="mt-12 rounded-xl border border-hairline bg-paper-50 p-6">
          <h2 className="font-display text-xl text-ink">Otras fuentes (en vivo, por petición)</h2>
          <ul className="mt-4 space-y-3 text-sm text-stone-600">
            <li><Strong>Anuncios:</Strong> Idealista, cuando está configurado el acceso. La aplicación identifica los ejemplos de demostración y los errores del proveedor.</li>
            <li><Strong>Trayectos:</Strong> OpenRouteService cuando está disponible. El transporte público y los respaldos se presentan como aproximaciones.</li>
            <li><Strong>Localización del mapa:</Strong> Nominatim / OpenStreetMap. La ubicación del anuncio puede ser aproximada.</li>
            <li><Strong>Tus datos:</Strong> el perfil y la última búsqueda se conservan en tu navegador. Las conversaciones y los favoritos de esta demo se comparten en Supabase. Las notificaciones usan una bandeja privada de este navegador y guardan una copia del perfil cuando las activas.</li>
          </ul>
        </section>

        <p className="mt-10 text-xs leading-relaxed text-mist">
          La actualización automática consulta las fuentes de mercado y conserva el último dato verificado si una descarga falla. Si no hay una copia disponible, se intenta la fuente en vivo. Un respaldo local no se convierte en un dato oficial: los valores sin procedencia verificada se omiten de estas tablas.
        </p>
      </main>
    </div>
  );
}

function DataCard({
  title,
  estado,
  fuente,
  sourceLink,
  meta,
  children,
}: {
  title: string;
  estado: Estado;
  fuente: string;
  sourceLink: { label: string; href: string };
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-hairline bg-paper-50">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl leading-tight text-ink">{title}</h2>
            <Pill estado={estado} />
          </div>
          <p className="mt-1.5 text-sm text-stone-600">{fuente}</p>
          <a href={sourceLink.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-saffron-700 underline decoration-saffron-300 underline-offset-4 hover:text-ink">{sourceLink.label} ↗</a>
        </div>
        <span className="max-w-full font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
          {meta}
        </span>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Collapsible({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.16em] text-saffron-700 transition hover:text-ink">
        <span className="group-open:hidden">▸ {summary}</span>
        <span className="hidden group-open:inline">▾ ocultar</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm tabular">
        <thead>
          <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-stone">
            {head.map((h, i) => (
              <th key={h} className={i === 0 ? "py-2 pr-3 font-medium" : "px-3 py-2 font-medium"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b border-hairline/60 last:border-b-0">
      {cells.map((c, i) => (
        <td
          key={i}
          className={i === 0 ? "py-1.5 pr-3 font-medium text-ink" : "px-3 py-1.5 text-ink-700"}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}

function Pill({ estado }: { estado: Estado }) {
  const cls =
    estado === "real"
      ? "border-sage-500/30 bg-sage-50 text-sage-500"
      : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${cls}`}>
      {estado === "real" ? "Fuente oficial" : "Sin verificar"}
    </span>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}

function Unavailable() {
  return (
    <p className="rounded-lg bg-paper-200 p-3 text-sm leading-relaxed text-stone-600">No hay cifras con procedencia verificada disponibles en este momento. Puedes consultar la publicación oficial en el enlace de esta sección.</p>
  );
}
