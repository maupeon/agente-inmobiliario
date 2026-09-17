# Datos y procedencia

[Volver al README](../README.md)

Los archivos de este repositorio son los necesarios para mostrar la aplicación y documentar su evidencia. No se incluyen anuncios reales descargados, conversaciones de usuarios ni el conjunto original de entrenamiento del TFM.

## Inventario

| Archivo o carpeta | Contenido | Motivo para conservarlo |
| --- | --- | --- |
| `data/madrid/madrid-official.json` | 131 barrios: superficie, población y densidad, a 1 de enero de 2026 | Tabla de contexto de `/datos`, con fuente y unidades |
| `data/madrid/madrid-context.json` | Zonas verdes de 2025 y actuaciones de Policía Municipal de mayo de 2026, por distrito | Contexto utilizado por la aplicación, con huellas de las fuentes |
| `data/madrid/urban-sources.json` | Recuentos censales, estaciones de Metro y referencia de ruido | Datos estructurados para `/datos` |
| `data/madrid/sources/` | CSV de zonas verdes y XLSX de Policía Municipal | Copias pequeñas que permiten reproducir el contexto de distrito |
| `lib/idealista/mock.ts` | Anuncios sintéticos con etiqueta Demo | Buscar sin credenciales del proveedor |
| `lib/market/fixtures.ts` | Respaldos ilustrativos identificados | Explicar la falta de referencias sin inventar observaciones oficiales |
| `app/presentacion/predictor-metadata.json` | Metadatos exactos del XGBoost vigente | Métricas declaradas, variables y periodos, sin reevaluación |
| `public/model-results/` | Metadatos, ganancia media, manifiesto y casos de referencia | Evidencia descargable del paquete vigente |
| `app/presentacion/results-data.json` | Resultados agregados del LightGBM anterior | Antecedente identificado en `/datos`; no describe XGBoost |
| `app/presentacion/results-legacy.json` | Antecedentes exploratorios identificados | Conservar la procedencia de los experimentos anteriores |
| `public/presentacion/` | Infografía utilizada, vídeo de demo, póster y subtítulos | Recursos activos de la presentación |

Los JSON conservan las URLs y los periodos de las fuentes. La fecha de consulta o caché no es la fecha de observación. Los recuentos de actuaciones policiales no equivalen a todos los delitos, a una tasa de criminalidad ni al riesgo individual. El importador de Zone prepara recuentos de distrito a partir de estas instantáneas; la página no los actualiza automáticamente.

La tabla de los 131 barrios se muestra plegada como «Contexto territorial». Población, superficie y densidad se conservan para consulta; actualmente no intervienen en la puntuación. Los importadores de contexto y fuentes urbanas también utilizan este archivo como catálogo de códigos y nombres de distrito.

Las columnas de actuaciones «Relacionadas con las personas» y «Relacionadas con el patrimonio» conservan la denominación de la fuente. No se reinterpretan como delitos contra personas o patrimonio.

Los recursos de terceros conservan su procedencia y las condiciones declaradas en sus fuentes. Su inclusión no atribuye al equipo la autoría ni una licencia propia sobre esos datos.

## Regenerar el contexto de distrito

Desde la raíz del repositorio:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install openpyxl==3.1.5
.venv/bin/python scripts/import-neighborhood-context.py
```

El script lee las dos copias de `data/madrid/sources/`, comprueba nombres, unidades, totales y los 21 distritos, y escribe `data/madrid/madrid-context.json`. No descarga datos ni genera un índice de seguridad. La tabla `madrid-official.json` conserva su fuente municipal; no hay un importador de esa tabla en este repositorio.

## Fuentes urbanas incorporadas

`data/madrid/urban-sources.json` es una instantánea de contexto para `/datos`. Sus líneas de Metro y el censo original alimentan los indicadores territoriales de Zone; se identifican como datos del distrito.

- **CRTM, Metro:** consulta de la capa `M4_Estaciones` (GeoServicio oficial enlazado desde el catálogo del Consorcio), 11-09-2026. Se conservan los 293 registros devueltos. La página muestra 240 estaciones con nombre y código municipal 079; omite dos registros sin nombre y los de otros municipios. Las líneas son las declaradas por el catálogo, sin prometer servicio activo ni frecuencias. No se agregan autobuses, Cercanías o Metro Ligero. URL y condiciones de reutilización en el JSON.
- **Censo municipal:** fichero de actividades descargable del 11-09-2026, con fecha de carga 10-09-2026 en todas sus 225.615 filas. Solo se cuentan locales cuya situación censal es `Abierto`, deduplicados por `id_local`, categoría y distrito. Un local abierto sin distrito se excluye. Las categorías pueden solaparse. No se utilizan las coordenadas ni se trasladan estos recuentos a barrios. Zone deduplica también entre categorías para obtener locales únicos por distrito.
- **Ruido:** enlace al mapa municipal MER 2021 y a su descarga TIF. Se identifica como ruido de tráfico, con indicadores Ld, Le, Ln y Lden. No se descargan ni interpretan píxeles como decibelios individuales: el usuario consulta la cartografía original. No es una medición actual de tranquilidad ni de ruido doméstico.

### Categorías censales

- Alimentación: epígrafes que empiezan por `4711` o `472`, excluyendo `472601` (estancos).
- Farmacias: `477301`.
- Gimnasios: `931008`.
- Ocio nocturno y espectáculos: `563002`, `563003`, `563007`, `932004`, `932005`, `932006` (bares especiales, cafés espectáculo, salas de fiesta, discotecas y salas de baile). No equivale a toda la hostelería ni a afluencia nocturna.

El JSON conserva el diccionario de epígrafes efectivamente incluidos, URLs, fechas y SHA-256 de los ficheros consultados. El CSV original no se versiona por su tamaño (125 MB); el importador permite recuperarlo de la URL fechada mientras la fuente lo mantenga.

### Reproducción

```bash
python3 scripts/import-urban-sources.py data/cache/urban
```

El directorio contiene `actividades` (CSV) y `metro-stations.json` (respuesta de la capa). Si faltan, se descargan. El script comprueba distritos, duplicados contradictorios, fecha censal, coordenadas de Metro y que la respuesta no esté truncada. Para cambiar de instantánea hay que revisar URLs, fechas y controles de cobertura, no sobrescribir solo la fecha de consulta. El servicio Metro es mutable; para reproducir su misma huella se necesita conservar la copia consultada.

## Datos de mercado consultados en ejecución

`lib/market/` consulta fuentes oficiales de INE, Banco de España y datos de vivienda del ministerio, conserva su procedencia y utiliza caché cuando está disponible. El IPV utiliza la tabla INE 79563, base 2025, y solicita el histórico desde 2018. No se mezclan niveles de bases distintas.

Si una fuente no puede verificarse, se muestra el respaldo o el dato ausente como tal. Los fixtures no se utilizan para presentar valoraciones individuales como evidencia oficial. La referencia independiente de alquiler de SERPAVI sigue pendiente de integración y no interviene en la estimación del modelo.

## Cómo se estima el alquiler

La ficha conserva el precio mensual del anuncio. Cuando el predictor XGBoost v3 devuelve una estimación válida, la aplicación compara esa mensualidad con una renta derivada del valor de venta y ratios distritales proyectados a 2026. El paquete utiliza últimas observaciones de venta de 2025 y alquiler de 2024, por lo que 2026 identifica el escenario proyectado:

`renta_mensual_estimada = precio_estimado × factor_renta_mensual`

La renta derivada no tiene validación independiente de alquiler ni intervalos calibrados. Fair compara anuncio y estimación mensual en una escala provisional, sin exigir bandas. Si el servicio no está disponible o se abstiene, se indica la ausencia de estimación. [Funcionamiento y API del predictor](modelo-xgboost.md).

## Metodología de Zone Score

Estado: cálculo por distrito con cuatro indicadores disponibles. La fórmula promedia cuatro componentes con igual peso interno, un 25% cada uno. Estos pesos son distintos de γ, el peso que el usuario asigna a Zone dentro del HabitIA Score.

`Zone = 100 × (I_verde + I_actuaciones + I_transporte + I_servicios) / 4`

Se utilizan recuentos absolutos, sin dividir por población ni superficie. Cada índice es el rango percentil entre los 21 distritos: `(rango medio − 1) / (n − 1)`. Los empates comparten rango medio; si toda la distribución es igual, el índice es 0,5. Para actuaciones se calcula `1 − percentil(valor)`. Se requieren al menos dos observaciones y una distribución completa, finita y no negativa; una ausencia no se interpreta como cero.

| Componente | Sentido | Dato utilizado |
| --- | --- | --- |
| Verde | Más m² verdes, mayor índice | Superficie municipal total publicada por distrito, 2025; excluye los parques del fichero separado |
| Actuaciones | Menos actuaciones, mayor índice | Suma de las cinco categorías de Policía Municipal, mayo de 2026; excluye registros sin distrito |
| Transporte | Más líneas, mayor índice | Líneas distintas de Metro con estación identificada en el distrito, catálogo consultado el 11 de septiembre de 2026; cada línea cuenta una vez por distrito |
| Servicios | Más servicios, mayor índice | Locales únicos abiertos en el censo de 10 de septiembre de 2026, de alimentación, farmacias, gimnasios u ocio; sin duplicados entre categorías |

Las fuentes tienen distintos periodos y coberturas. Menos actuaciones no acredita mayor seguridad; los recuentos absolutos pueden favorecer distritos grandes o poblados. Transporte solo incluye Metro y servicios las categorías declaradas. Es una regla de preferencia relativa, no una medida validada de calidad de vida.

`zoneForProperty` solo identifica nombres o códigos explícitos de distrito en anuncios de Madrid; no usa el perfil, coincidencias parciales ni proximidad. Sin distrito identificado, Zone permanece en `null`. No se presentan los datos del distrito como mediciones de cada barrio.

Descanso queda fuera de los indicadores, el divisor y la cobertura. Con los cuatro indicadores disponibles, Zone tiene cobertura del 100% y puede alcanzar 100 puntos. Con γ = 25, aporta hasta 25 puntos al total. Si faltara uno de los cuatro indicadores, su dato permanece en null y su peso no se redistribuye. La versión del cálculo es `zone-percentiles-v2`.

El buscador muestra el HabitIA Score numérico en la cabecera. Si la cobertura global es inferior al 100%, conserva el total y añade «parcial»; sin ningún dato evaluable muestra un guion. Con los cuatro subscores disponibles, la cobertura puede llegar al 100%. Fair y Opportunity se calculan según las reglas provisionales documentadas en `docs/price-scores.md`.

### Reproducir los indicadores

```bash
python3 scripts/import-zone-indicators.py /ruta/a/actividades
```

El script comprueba que el SHA-256 del censo coincida con `urban-sources.json`, valida sus recuentos por categoría y distrito, y deduplica los locales entre categorías. Cuenta líneas distintas de Metro y excluye los dos registros municipales sin nombre ni distrito. No descarga datos. Produce `lib/neighborhood/zone-data.ts`, con los 21 distritos, los valores ausentes y las fuentes, periodos y huellas. El censo se puede recuperar mediante el importador de fuentes urbanas descrito arriba.

`lib/neighborhood/zone-score.ts` calcula los percentiles y `personalScore` los incorpora al ranking. La fórmula y sus límites se explican en `/como-funciona#zone-score` y cada ficha desglosa valores originales, índices, aportaciones y fuentes.

Los datos originales de entrenamiento y los artefactos del modelo pertenecen a la entrega separada de la memoria: [Servicio externo](modelo-externo.md).
