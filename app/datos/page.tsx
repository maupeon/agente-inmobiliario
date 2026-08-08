import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { getMarketData } from "@/lib/market/cache";
import {
  NEIGHBORHOOD_FIXTURES,
  NEIGHBORHOOD_PROVINCE_FIXTURES,
} from "@/lib/neighborhood/fixtures";
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
  const [price, ipv, bde, rent] = await Promise.all([
    getMarketData("ine_price_by_province"),
    getMarketData("ine_ipv_quarterly"),
    getMarketData("bde_mortgage_rates"),
    getMarketData("rent_reference"),
  ]);

  const freshness = (updatedAt: string | null, fromFallback: boolean) =>
    fromFallback || !updatedAt ? "respaldo local" : `cacheado ${timeAgo(updatedAt)}`;

  return (
    <div className="relative z-10">
      <SiteNav />
      <main className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-10 sm:px-8">
        <div className="flex items-center justify-between gap-4 border-y border-ink py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
          <span>Datos</span>
          <span className="hidden sm:inline">Contenido real · Fuente · Ubicación</span>
          <span className="tabular text-stone">№ 003</span>
        </div>

        <header className="mt-10 max-w-[62ch]">
          <h1 className="font-display text-display-md text-ink">Todos los datos, y dónde están</h1>
          <p className="mt-4 text-lg leading-relaxed text-stone-600">
            Esto es exactamente lo que el agente usa por dentro: el contenido real
            de cada conjunto de datos, su fuente, dónde vive en el código y cuándo
            se actualizó. En <Pill estado="real" /> los datos oficiales en vivo; en{" "}
            <Pill estado="orientativo" /> los orientativos (snapshots o curados).
          </p>
        </header>

        {/* Precio €/m² compra por provincia */}
        <DataCard
          title="Precio de compra · €/m² por provincia"
          estado={price.fromFallback ? "orientativo" : "real"}
          fuente={price.data.fuente}
          ubicacion="lib/market/mitma.ts → caché Supabase market_data"
          meta={`${price.data.data.length} provincias · periodo ${price.data.periodo} · ${freshness(price.updatedAt, price.fromFallback)}`}
        >
          <Collapsible summary={`Ver las ${price.data.data.length} provincias`}>
            <Table head={["Provincia", "€/m²", "Var. anual"]}>
              {[...price.data.data]
                .sort((a, b) => b.precioM2 - a.precioM2)
                .map((p) => (
                  <Row key={p.provincia} cells={[p.provincia, `${formatNumber(p.precioM2)} €`, p.variacionInteranual != null ? `${p.variacionInteranual > 0 ? "+" : ""}${p.variacionInteranual}%` : "—"]} />
                ))}
            </Table>
          </Collapsible>
        </DataCard>

        {/* IPV */}
        <DataCard
          title="Tendencia de precios · IPV (variación interanual)"
          estado={ipv.fromFallback ? "orientativo" : "real"}
          fuente={ipv.data.fuente}
          ubicacion="lib/market/ine.ts (INE Tempus3, tabla 25171)"
          meta={`${ipv.data.serie.length} trimestres · ${freshness(ipv.updatedAt, ipv.fromFallback)}`}
        >
          <Table head={["Trimestre", "Variación interanual"]}>
            {ipv.data.serie.map((q) => (
              <Row key={q.periodo} cells={[q.periodo, `${q.variacionInteranual > 0 ? "+" : ""}${q.variacionInteranual}%`]} />
            ))}
          </Table>
        </DataCard>

        {/* Tipos hipoteca */}
        <DataCard
          title="Financiación · tipos hipotecarios"
          estado={bde.fromFallback ? "orientativo" : "real"}
          fuente={bde.data.fuente}
          ubicacion="lib/market/bde.ts (Banco de España, CSV)"
          meta={`periodo ${bde.data.periodo} · ${freshness(bde.updatedAt, bde.fromFallback)}`}
        >
          <Table head={["Indicador", "Valor"]}>
            <Row cells={["Tipo medio hipotecas vivienda", `${bde.data.tipoMedio}%`]} />
            <Row cells={["Euríbor 12 meses", bde.data.euribor12m != null ? `${bde.data.euribor12m}%` : "—"]} />
          </Table>
        </DataCard>

        {/* Alquiler referencia */}
        <DataCard
          title="Alquiler · referencia €/m²/mes"
          estado="orientativo"
          fuente={rent.data.fuente}
          ubicacion="lib/market/fixtures.ts (snapshot SERPAVI/MIVAU; el portal bloquea descargas)"
          meta={`${rent.data.zonas.length} barrios + ${rent.data.provincias.length} provincias · periodo ${rent.data.periodo}`}
        >
          <Collapsible summary={`Ver ${rent.data.zonas.length} barrios + ${rent.data.provincias.length} provincias`}>
            <Table head={["Zona", "Ámbito", "€/m²/mes", "Rango"]}>
              {rent.data.zonas.map((z) => (
                <Row
                  key={`${z.zona}-${z.municipio ?? ""}`}
                  cells={[z.zona, z.municipio ?? "—", `${z.eurM2Mes}`, z.min != null && z.max != null ? `${z.min}–${z.max}` : "—"]}
                />
              ))}
              {rent.data.provincias.map((p) => (
                <Row
                  key={`prov-${p.provincia}`}
                  muted
                  cells={[p.provincia, "provincia", `${p.eurM2Mes}`, p.min != null && p.max != null ? `${p.min}–${p.max}` : "—"]}
                />
              ))}
            </Table>
          </Collapsible>
        </DataCard>

        {/* Barrios: seguridad + calidad de vida */}
        <DataCard
          title="Barrios · seguridad y calidad de vida"
          estado="orientativo"
          fuente="Compuesto de fuentes públicas (Balance de Criminalidad, datos municipales)"
          ubicacion="lib/neighborhood/fixtures.ts (datos curados, no en vivo a nivel de barrio)"
          meta={`${NEIGHBORHOOD_FIXTURES.length} barrios + ${NEIGHBORHOOD_PROVINCE_FIXTURES.length} provincias`}
        >
          <Collapsible summary={`Ver ${NEIGHBORHOOD_FIXTURES.length} barrios`}>
            <Table head={["Barrio", "Ciudad", "Seguridad", "Crim./1k", "Transp.", "Verde", "Servic.", "Ocio", "Tranq."]}>
              {NEIGHBORHOOD_FIXTURES.map((n) => (
                <Row
                  key={`${n.zona}-${n.municipio ?? ""}`}
                  cells={[n.zona, n.municipio ?? "—", `${n.seguridad}`, `${n.tasaCriminalidad}`, `${n.transporte}`, `${n.zonasVerdes}`, `${n.servicios}`, `${n.vidaNocturna}`, `${n.tranquilidad}`]}
                />
              ))}
            </Table>
          </Collapsible>
        </DataCard>

        {/* Otras fuentes no tabulares */}
        <section className="mt-12 rounded-xl border border-hairline bg-paper-50 p-6">
          <h2 className="font-display text-xl text-ink">Otras fuentes (en vivo, por petición)</h2>
          <ul className="mt-4 space-y-3 text-sm text-stone-600">
            <li><Strong>Anuncios:</Strong> Idealista (mock coherente hasta tener clave propia) — <Code>lib/idealista/</Code></li>
            <li><Strong>Trayecto y rutas:</Strong> OpenRouteService (real con <Code>ORS_API_KEY</Code>) — <Code>lib/commute/index.ts</Code></li>
            <li><Strong>Geocodificación del mapa:</Strong> Nominatim / OpenStreetMap — <Code>lib/commute/index.ts</Code> y <Code>/api/geocode</Code></li>
            <li><Strong>Persistencia:</Strong> Supabase — conversaciones, favoritos y caché de mercado — <Code>lib/supabase/</Code></li>
          </ul>
        </section>

        <p className="mt-10 text-xs leading-relaxed text-mist">
          Los datos de mercado se refrescan con el cron <Code>/api/cron/market</Code> y se cachean en Supabase; si la
          caché está vacía se intenta la fuente en vivo y, si falla, se usa el respaldo local. Seguridad y alquiler por
          barrio son orientativos.
        </p>
      </main>
    </div>
  );
}

function DataCard({
  title,
  estado,
  fuente,
  ubicacion,
  meta,
  children,
}: {
  title: string;
  estado: Estado;
  fuente: string;
  ubicacion: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-hairline bg-paper-50">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl leading-tight text-ink">{title}</h2>
            <Pill estado={estado} />
          </div>
          <p className="mt-1.5 text-sm text-stone-600">{fuente}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
            ↳ {ubicacion}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
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

function Row({ cells, muted }: { cells: string[]; muted?: boolean }) {
  return (
    <tr className="border-b border-hairline/60 last:border-b-0">
      {cells.map((c, i) => (
        <td
          key={i}
          className={`${i === 0 ? "py-1.5 pr-3 font-medium text-ink" : "px-3 py-1.5"} ${muted && i > 0 ? "text-mist" : "text-ink-700"}`}
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
      : "border-saffron-300/40 bg-saffron-50 text-saffron-700";
  return (
    <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${cls}`}>
      {estado}
    </span>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-[12px] text-ink-700">
      {children}
    </code>
  );
}
