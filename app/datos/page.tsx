import context from "@/lib/neighborhood/madrid-context.json";
import modelResults from "@/app/presentacion/results-data.json";
import madrid from "@/lib/neighborhood/madrid-official.json";
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
            Consulta los datos del modelo, las referencias de mercado y las fuentes del entorno.
            La fecha de consulta indica cuándo recuperamos el dato; el periodo
            indica qué momento describe. Si solo hay ejemplos o una copia sin
            procedencia verificada, lo señalamos y no mostramos sus cifras como referencia.
          </p>
        </header>

        <section id="datos-modelo" className="mt-8 overflow-hidden rounded-xl border border-hairline bg-paper-50">
          <header className="border-b border-hairline p-5">
            <h2 className="font-display text-xl leading-tight text-ink">Datos utilizados para el modelo de precio</h2>
            <p className="mt-1.5 text-sm text-stone-600">Idealista18 · anuncios de venta de Madrid · cuatro trimestres de 2018</p>
            <p className="mt-2 break-words font-mono text-[10px] uppercase tracking-[0.14em] text-stone">LightGBM · {modelResults.model_id} · revisión del 8 de septiembre de 2026</p>
          </header>
          <div className="space-y-5 p-5 text-sm leading-relaxed text-stone-600">
            <p>La fuente histórica declarada es <Strong>Idealista18</Strong>, descrita por Rey-Blanco, Arbués, López y Páez (2024). El modelo aprende el <Strong>precio anunciado de venta</Strong>, no el precio de cierre. Este conjunto histórico es distinto de los anuncios que recupera la búsqueda actual.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="https://doi.org/10.1177/23998083241242844" target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline underline-offset-4">Artículo de la fuente ↗</a>
              <a href="https://paezha.github.io/idealista18/reference/Madrid_Sale.html" target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline underline-offset-4">Datos y diccionario de Madrid ↗</a>
              <a href="https://paezha.github.io/idealista18/LICENSE.html" target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline underline-offset-4">Licencia ODbL ↗</a>
            </div>
            <Table head={["Etapa de la revisión local", "Registros"]}>
              <Row cells={["Fichero enriquecido recibido", formatNumber(modelResults.sample.input)]} />
              <Row cells={["Tras fusionar duplicados de enriquecimiento", "94.815"]} />
              <Row cells={["Elegibles para el modelo", formatNumber(modelResults.sample.eligible)]} />
              <Row cells={["Ajuste del modelo conservado", formatNumber(modelResults.sample.fit)]} />
              <Row cells={["Calibración de sus intervalos", formatNumber(modelResults.sample.calibration)]} />
              <Row cells={["Evaluación de ese modelo", formatNumber(modelResults.sample.test)]} />
            </Table>
            <p>Los conteos corresponden al fichero local auditado. Las filas pueden representar anuncios del mismo inmueble; las particiones mantienen cada identificador de activo en un solo bloque. Los registros de calibración y evaluación no se usan para ajustar el modelo conservado. La evaluación es retrospectiva: el histórico ya había sido explorado.</p>
            <p><Strong>{modelResults.n_features} variables de entrada.</Strong> Características de la vivienda y su localización, indicadores de datos ausentes, variables derivadas y categorías territoriales. El precio anunciado es el objetivo; precio por m², alquiler, rentabilidad y variables catastrales no son entradas del modelo principal.</p>
            <Collapsible summary="Procedencia y límites del histórico">
              <div className="space-y-3">
                <p>Los precios y las coordenadas de la fuente están perturbados por anonimización. La ubicación aprendida es aproximada. El fichero recibido incorpora enriquecimientos cuyo proceso original no se pudo reconstruir por completo; las capas de alquiler y Catastro sin disponibilidad histórica acreditada se excluyen del modelo principal.</p>
                <p>El diccionario público muestra conteos incompatibles entre su cabecera y su descripción final. Aquí se publican los conteos comprobados en la revisión local, sin equiparar las filas recibidas a viviendas únicas.</p>
                <p>El ajuste temporal mediante IPV es un escenario indexado: no reentrena el modelo ni demuestra su precisión en 2026. Este histórico no valida precios de cierre, alquileres, ahorro ni rentabilidad futura.</p>
              </div>
            </Collapsible>
          </div>
        </section>

        {/* Precio €/m² compra por provincia */}
        <DataCard
          title="Compra · valor tasado medio por provincia"
          estado={price.fromFallback ? "orientativo" : "real"}
          fuente={price.data.fuente}
          sourceLink={MARKET_SOURCES.valuation}
          meta={price.fromFallback ? "Sin referencia verificada disponible" : `${price.data.data.length} provincias · ${formatMarketPeriod(price.data.periodo)} · ${freshness(price.updatedAt, false)}`}
        >
          <p className="mb-4 text-sm leading-relaxed text-stone-600">Es una media de tasaciones de vivienda libre, expresada en €/m². Se usa como contexto provincial en las consultas de mercado. No alimenta la proyección temporal del modelo ni el HabitIA Score. Las fichas de vivienda ya no muestran este bloque; aquí puedes consultar y contrastar la referencia general.</p>
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
          title="Evolución de precios · IPV 2018–2026 · base 2025"
          estado={ipv.fromFallback ? "orientativo" : "real"}
          fuente={ipv.data.fuente}
          sourceLink={MARKET_SOURCES.ipv}
          meta={ipv.fromFallback ? "Sin serie verificada disponible" : `${ipv.data.serie.length} trimestres · ${freshness(ipv.updatedAt, false)}`}
        >
          <p className="mb-4 text-sm leading-relaxed text-stone-600">El IPV describe cómo cambian los precios de compraventa. Una variación interanual compara con el mismo trimestre del año anterior. Q1 = enero–marzo; Q2 = abril–junio; Q3 = julio–septiembre; Q4 = octubre–diciembre.</p>
          {ipv.fromFallback ? <Unavailable /> : (
          <div><p className="mb-4 text-sm leading-relaxed text-stone-600">Para indexar se compara el nivel del índice con su media de 2018: precio estimado de 2018 × índice del trimestre / índice medio de 2018. No se suman tasas interanuales. Esta serie nacional aporta contexto; el servicio usa el factor de su artefacto versionado y no se actualiza al abrir esta página. El IPV autonómico de Madrid es el ámbito del escenario del modelo.</p>
          {ipv.data.serie.at(-1)?.periodo.slice(0, 4) !== String(new Date().getFullYear()) && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Último trimestre recibido: {formatMarketPeriod(ipv.data.serie.at(-1)?.periodo ?? "sin periodo")}. Los trimestres posteriores todavía no están en esta descarga; no se interpolan ni se presentan como observados.</p>}
          <Collapsible summary={`Ver histórico desde 2018 · ${ipv.data.serie.length} trimestres`}><Table head={["Trimestre", "Nivel del índice", "Variación interanual", "Factor vs. media 2018"]}>
            {ipv.data.serie.map((q) => (
              <Row key={q.periodo} cells={[formatMarketPeriod(q.periodo), q.indice == null ? "—" : formatNumber(q.indice), `${q.variacionInteranual > 0 ? "+" : ""}${q.variacionInteranual}%`, q.indice != null && ipv.data.base2018 ? `${(q.indice / ipv.data.base2018).toFixed(3)}×` : "—"]} />
            ))}
          </Table></Collapsible>
          {ipv.data.madridSegundaMano && <div className="mt-5"><Collapsible summary="Ver histórico de Madrid · vivienda de segunda mano"><Table head={["Trimestre", "Nivel del índice", "Factor vs. media 2018"]}>{ipv.data.madridSegundaMano.serie.map((q) => <Row key={q.periodo} cells={[formatMarketPeriod(q.periodo), formatNumber(q.indice), `${(q.indice / ipv.data.madridSegundaMano!.base2018).toFixed(3)}×`]} />)}</Table></Collapsible><p className="mt-3 text-xs leading-relaxed text-stone-600">Ámbito autonómico, no barrio ni ciudad. El factor mostrado usa la media de 2018 de esta misma serie. No sustituye automáticamente el escenario heredado del artefacto.</p></div>}
          </div>
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

        <DataCard
          title="Alquiler · qué datos usamos hoy"
          estado="orientativo"
          fuente="Renta del anuncio; referencia independiente pendiente."
          sourceLink={MARKET_SOURCES.rent}
          meta="No aporta puntos al Score"
        >
          <div className="space-y-3 text-sm leading-relaxed text-stone-600">
            <p>El precio de alquiler que ves es el del anuncio. Para saber cómo se compara con el mercado necesitamos una referencia de viviendas comparables, con zona y periodo conocidos.</p>
            <p>Esa referencia todavía no está integrada. Este bloque explica la fuente prevista; no calcula una renta ni clasifica el anuncio como barato o caro. Fair de alquiler permanece sin dato. La metodología de SERPAVI se enlaza para consulta.</p>
          </div>
        </DataCard>

        <section aria-labelledby="neighborhood-data-title" className="mt-12">
          <h2 id="neighborhood-data-title" className="font-display text-2xl text-ink">El entorno de la vivienda</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">Zonas verdes y seguridad vuelven a tener su espacio con datos municipales. Cada tabla indica si describe un distrito o un barrio. Son referencias de contexto y todavía no se convierten en puntos de Zone.</p>
        </section>
        <DataCard title="Zonas verdes · superficie por distrito" estado="real" fuente={context.zonasVerdes.fuente} sourceLink={{ label: "Descargar datos originales (CSV)", href: context.zonasVerdes.download }} meta="21 distritos · 2025 · consulta 11 septiembre 2026">
          <p className="mb-4 text-sm leading-relaxed text-stone-600">{context.zonasVerdes.nota} Es superficie total, no proximidad a tu vivienda ni un índice de calidad de vida.</p>
          <Collapsible summary="Ver zonas verdes de los 21 distritos">
            <Table head={["Distrito", "Zonas verdes (m²)"]}>
              {context.zonasVerdes.distritos.map(d => <Row key={d.code} cells={[d.distrito, formatNumber(d.superficieM2)]} />)}
            </Table>
          </Collapsible>
        </DataCard>
        <DataCard title="Seguridad · actuaciones de Policía Municipal" estado="real" fuente={context.seguridad.fuente} sourceLink={{ label: "Descargar publicación original (XLSX)", href: context.seguridad.download }} meta="21 distritos · mayo 2026 · consulta 11 septiembre 2026">
          <p className="mb-4 text-sm leading-relaxed text-stone-600">{context.seguridad.nota} No se trasladan estas cifras a cada barrio ni se utilizan para ordenar viviendas.</p>
          <Collapsible summary="Ver actuaciones por distrito y categoría">
            <Table head={["Distrito", "Personas", "Patrimonio", "Tenencia de armas", "Tenencia de drogas", "Consumo de drogas"]}>
              {context.seguridad.distritos.map(d => <Row key={d.code} cells={[d.distrito, ...d.actuaciones.map(v => formatNumber(v))]} />)}
              <Row cells={["Sin distrito asignado", ...context.seguridad.sinDistrito.map(v => formatNumber(v))]} />
              <Row cells={["Total publicado", ...context.seguridad.totales.map(v => formatNumber(v))]} />
            </Table>
            <p className="mt-3 text-xs leading-relaxed text-stone-600">Todas las columnas cuentan actuaciones. «Personas» y «Patrimonio» son actuaciones relacionadas con esas materias; no recuentos de víctimas ni tasas por habitante.</p>
          </Collapsible>
        </DataCard>
        <section className="mt-8 rounded-xl border border-hairline bg-paper-50 p-5" aria-labelledby="other-neighborhood-indicators">
          <h3 id="other-neighborhood-indicators" className="font-display text-xl text-ink">Transporte, servicios, vida nocturna y tranquilidad</h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">El transporte se evalúa mediante el tiempo al trabajo en las fichas. Los índices de barrio de transporte, servicios, vida nocturna y tranquilidad todavía no tienen una medición verificada integrada. Las antiguas puntuaciones manuales no se muestran como datos reales.</p>
        </section>

        <DataCard title="Barrios de Madrid · superficie, población y densidad" estado="real" fuente={madrid.fuente} sourceLink={{ label: "Ayuntamiento de Madrid · tabla original (XLSX)", href: madrid.url }} meta="131 barrios · 1 enero 2026 · consulta 11 septiembre 2026">
          <p className="mb-4 text-sm leading-relaxed text-stone-600">Población y superficie describen el territorio. Complementan las referencias de zonas verdes y seguridad; no las sustituyen ni indican si un barrio es mejor para vivir.</p>
          <Collapsible summary="Ver los 131 barrios · datos territoriales, sin puntuación de calidad de vida">
            <Table head={["Barrio", "Distrito", "Superficie (ha)", "Población", "Densidad (hab./ha)"]}>
              {madrid.barrios.map((b) => <Row key={b.code} cells={[b.barrio, b.distrito, formatNumber(b.superficieHa), formatNumber(b.poblacion), formatNumber(b.densidadHabHa)]} />)}
            </Table>
          </Collapsible>
        </DataCard>

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
