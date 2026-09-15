import urban from "@/data/madrid/urban-sources.json";

const format = (value: number) => value.toLocaleString("es-ES");
const categories = ["alimentacion", "farmacias", "gimnasios", "ocio"] as const;

export function UrbanSources() {
  const stations = urban.metro.estaciones.filter(s => s.municipio === "079" && s.nombre !== "Sin nombre en el catálogo");
  return (
    <div className="mt-8 space-y-8" id="fuentes-entorno">
      <SourceSection title="Transporte · estaciones de Metro" source={urban.metro.fuente} meta="Municipio de Madrid · catálogo consultado el 11 de septiembre de 2026">
        <p>Consulta {format(stations.length)} estaciones identificadas del catálogo y sus líneas. Es una copia de la red publicada por el CRTM: no incluye autobuses ni Cercanías y no informa de incidencias, frecuencias ni aperturas en tiempo real. El tiempo al trabajo se calcula por separado en las fichas.</p>
        <Links links={[["Catálogo original", urban.metro.url], ["Descargar datos consultados (JSON)", urban.metro.download], ["Condiciones de reutilización", urban.metro.licencia]]} />
        <details className="group">
          <summary className="cursor-pointer py-2 font-medium text-saffron-700">Ver las {format(stations.length)} estaciones y sus líneas</summary>
          <DataTable headers={["Estación", "Líneas en el catálogo"]}>
            {stations.map(s => <tr key={s.id}><th scope="row">{s.nombre}</th><td>{s.lineas}</td></tr>)}
          </DataTable>
        </details>
      </SourceSection>

      <SourceSection title="Servicios y ocio · locales por distrito" source={urban.locales.fuente} meta="21 distritos · datos del 10 de septiembre de 2026 · CC BY 4.0">
        <p>Recuentos de locales que figuran como <strong>abiertos en el censo</strong>, no necesariamente abiertos en este momento. Se cuenta cada local una sola vez por categoría y distrito, aunque tenga varias actividades. Un local puede aparecer en más de una categoría; las columnas no se suman para obtener un total de locales.</p>
        <Links links={[["Fuente y condiciones de uso", urban.locales.url], ["Descargar actividades originales (CSV · 125 MB)", urban.locales.download]]} />
        <details>
          <summary className="cursor-pointer py-2 font-medium text-saffron-700">Ver servicios y ocio de los 21 distritos</summary>
          <DataTable headers={["Distrito", "Alimentación", "Farmacias", "Gimnasios", "Ocio nocturno y espectáculos"]}>
            {urban.locales.distritos.map(d => <tr key={d.code}><th scope="row">{d.nombre}</th>{categories.map(k => <td key={k}>{format(d[k])}</td>)}</tr>)}
            <tr><th scope="row">Total de los distritos</th>{categories.map(k => <td key={k}>{format(urban.locales.distritos.reduce((sum, d) => sum + d[k], 0))}</td>)}</tr>
          </DataTable>
        </details>
        <p><strong>Qué incluye cada columna.</strong> Alimentación: autoservicios y comercio alimentario, excluyendo estancos. Farmacias y gimnasios: sus epígrafes específicos. Ocio: bares especiales, cafés espectáculo, salas de fiesta, discotecas y salas de baile; no todos los bares y restaurantes.</p>
        <p>Son cantidades absolutas, no medidas de calidad, proximidad o disponibilidad por habitante. El registro puede contener inconsistencias; {format(urban.locales.localesAbiertosSinDistrito)} {urban.locales.localesAbiertosSinDistrito === 1 ? "local abierto sin distrito queda fuera" : "locales abiertos sin distrito quedan fuera"} de la tabla. La oferta nocturna no indica afluencia, horarios ni ruido real.</p>
        <details>
          <summary className="cursor-pointer py-2 font-medium text-saffron-700">Ver actividades incluidas en los recuentos</summary>
          <DataTable headers={["Epígrafe municipal", "Actividad"]}>
            {Object.entries(urban.locales.epigrafes).sort(([a], [b]) => a.localeCompare(b)).map(([code, label]) => <tr key={code}><th scope="row">{code}</th><td>{label}</td></tr>)}
          </DataTable>
        </details>
      </SourceSection>

      <p className="text-sm leading-relaxed text-stone-600">Zone cuenta líneas distintas de Metro por distrito y locales únicos de las categorías de servicios, sin duplicarlos cuando aparecen en varias categorías. Zone combina cuatro indicadores al 25% cada uno y se atribuye al distrito, no al barrio. Las tablas son copias fechadas; consulta la fuente para comprobar cambios posteriores.</p>
    </div>
  );
}

function SourceSection({ title, source, meta, children }: { title: string; source: string; meta: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-hairline bg-paper-50">
    <header className="border-b border-hairline p-5">
      <h2 className="font-display text-xl leading-tight text-ink">{title}</h2>
      <p className="mt-1.5 text-sm text-stone-600">{source}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">{meta}</p>
    </header>
    <div className="space-y-4 p-5 text-sm leading-relaxed text-stone-600">{children}</div>
  </section>;
}

function Links({ links }: { links: [string, string][] }) {
  return <div className="flex flex-wrap gap-x-5 gap-y-1">{links.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-saffron-700 underline underline-offset-4">{label} ↗</a>)}</div>;
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse text-left text-sm tabular [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_tr]:border-b [&_tr]:border-hairline">
    <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone"><tr>{headers.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{children}</tbody>
  </table></div>;
}
