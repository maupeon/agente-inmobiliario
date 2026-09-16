# Fair y Opportunity: implementación provisional

Actualización: 16 de septiembre de 2026. Estas reglas de preferencia desbloquean la aplicación; no son una calibración estadística. La propuesta v12 de la presentación usa percentiles y sigue diferenciada de esta implementación lineal. No se emplea el test reservado ni se altera el predictor.

## Fair

`desviación = 100 × (precio_anunciado / precio_estimado − 1)`

`Fair = min(100, max(0, 50 − 2,5 × desviación))`

Coincidencia: 50. Un 10% por debajo: 75; un 20% o más por debajo: 100. Un 10% por encima: 25; un 20% o más por encima: 0. El centro 50 y la amplitud ±20% son decisiones provisionales de producto, no intervalos de confianza ni umbrales estimados.

Se exige valoración individual válida, estado `ok`, versión, ausencia de respaldo, identidad de anuncio y operación coincidente. Los precios deben ser finitos y positivos. Se recalcula la desviación con los importes comparables, en lugar de confiar en una desviación o banda antigua. Venta compara euros totales; alquiler compara €/mes. La estimación de renta procede de venta a nivel de 2025 y ratios distritales de 2024, sin validación independiente de alquiler. Si el servicio se abstiene, no hay Fair. Las bandas y los intervalos del predictor permanecen intactos.

## Opportunity

`diferencia = variación_anual_distrito − variación_anual_Madrid` (puntos porcentuales)

`Opportunity = min(100, max(0, 50 + 2,5 × diferencia))`

Mismo crecimiento: 50. Diez puntos porcentuales de ventaja: 75. Veinte o más: 100. Las desventajas restan simétricamente. No se divide por el crecimiento de Madrid: funciona si es cero o negativo. El factor 2,5 es una decisión provisional de escala.

Fuente primaria: [Idealista, informe de venta de Madrid](https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/madrid-comunidad/madrid-provincia/madrid/), columna Variación anual de la tabla de localizaciones. Se transcribieron y contrastaron las 22 tasas publicadas (ciudad y 21 distritos), consultadas el 14/09/2026: **agosto de 2025 a agosto de 2026**, Madrid **2,2%**. No se descargó ni se afirma disponer de la serie mensual completa. No se reconstruyen precios históricos a partir de tasas redondeadas. La descarga directa devolvía 403; la tabla se consultó mediante la herramienta de navegación web.

La [metodología de julio de 2026](https://st3.idealista.com/cms/archivos/static/price-indicator/es-metodologia-informes-de-precios-vivienda-2026.pdf) revisa las series históricas. Todos los valores proceden de la misma tabla y edición; no se mezclan con notas de prensa anteriores a la revisión. Son precios de oferta, no de cierre. Se había localizado también una tabla municipal registral de 2025, pero no se usa: no se pudo recuperar una pareja comparable del año anterior.

La copia fija está en `lib/scoring/opportunity-data.ts`, con fecha de consulta, periodo y nombre literal del proveedor. Actualización manual: revisar el informe y su metodología, transcribir ciudad y todos los distritos del mismo periodo, conservar la fecha y comprobar las 22 tasas. La fuente incluye viviendas de distintas tipologías; no equivale a la revalorización de un inmueble concreto.

Se usa el distrito explícito de un anuncio de Madrid. Se admiten códigos y nombres exactos, sin inferencia por cercanía, barrio o perfil. Alias documentados: Barrio de Salamanca→Salamanca, Fuencarral→Fuencarral-El Pardo, Moncloa→Moncloa-Aravaca y San Blas→San Blas-Canillejas.

Se aplica a compra y alquiler con la misma referencia de evolución de venta del distrito y la misma escala. En alquiler mide la revalorización de venta de la zona, no la evolución de la renta. Conserva el peso beta elegido por el usuario. No es predicción de rentabilidad.

## Integración y comprobación

`lib/scoring/price-scores.ts` concentra ambos cálculos y `personalScore` los comparte entre buscador, cambios de pesos y recomendaciones. Cada ficha conserva importes/tasas, periodo, regla y procedencia en un detalle desplegable. Ausencias siguen siendo null; no se redistribuyen pesos. Zone tiene 100% de cobertura interna con sus cuatro indicadores; con pesos iguales, compra y alquiler pueden alcanzar 100% de cobertura si Fair y Lifestyle están disponibles.

Pruebas: límites, monotonía, cero, signos, datos inválidos, correspondencia de anuncio/operación, ausencia de estimación, independencia entre Opportunity y precio individual, atribución territorial, cobertura ponderada y los contratos reales XGBoost de compra y alquiler.

## Revisión de alquiler en el dashboard

Opportunity conserva en alquiler los mismos valores, fuente y periodo de venta que en compra; Chamberí obtiene 54,5/100. Fair compara mensualidades y mantiene la misma escala que compra. Un anuncio al menos un 20% por encima de su estimación obtiene 0/100: es un resultado calculado, no un dato ausente, y se explica junto al desglose. No se modifica el predictor ni se fuerza una puntuación positiva.

## Cambio de modelo del 16 de septiembre

El paquete exportado el 15/09/2026 incorpora 410 árboles y se integra mediante el contrato 3.2.0. Fair y el Fit Score global usan sus nuevas estimaciones, comprobando la versión y el hash vigentes. Las valoraciones guardadas del modelo anterior no se reutilizan para calcular Fair. Se conserva la escala lineal: esta entrega no aporta una nueva calibración de scores.

Las abstenciones por descripción de vivienda a reformar u ocupada/alquilada dejan Fair ausente y reducen la cobertura ponderada; no equivalen a Fair = 0. Obra nueva conserva el cálculo con una advertencia sobre anuncios dependientes de una misma promoción. El contrato sigue comparando venta total y alquiler mensual por separado, con venta indexada a 2025 y ratios de renta de 2024.
