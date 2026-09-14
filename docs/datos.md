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
| `app/presentacion/results-data.json` | Resultados agregados del experimento revisado | Mostrar las cifras del TFM sin ejecutar el entrenamiento |
| `app/presentacion/results-legacy.json` | Antecedentes exploratorios identificados | Mantener la comparación histórica que usa la presentación |
| `public/presentacion/` | Infografía utilizada, vídeo de demo, póster y subtítulos | Recursos activos de la presentación |

Los JSON conservan las URLs y los periodos de las fuentes. La fecha de consulta o caché no es la fecha de observación. Los recuentos de actuaciones policiales no equivalen a todos los delitos, a una tasa de criminalidad ni al riesgo individual. Ninguna de estas tablas genera automáticamente el componente Zone.

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

`data/madrid/urban-sources.json` es una instantánea de contexto para `/datos`. No alimenta el Zone Score ni atribuye métricas a una vivienda.

- **CRTM, Metro:** consulta de la capa `M4_Estaciones` (GeoServicio oficial enlazado desde el catálogo del Consorcio), 11-09-2026. Se conservan los 293 registros devueltos. La página muestra 240 estaciones con nombre y código municipal 079; omite dos registros sin nombre y los de otros municipios. Las líneas son las declaradas por el catálogo, sin prometer servicio activo ni frecuencias. No se agregan autobuses, Cercanías o Metro Ligero. URL y condiciones de reutilización en el JSON.
- **Censo municipal:** fichero de actividades descargable del 11-09-2026, con fecha de carga 10-09-2026 en todas sus 225.615 filas. Solo se cuentan locales cuya situación censal es `Abierto`, deduplicados por `id_local`, categoría y distrito. Un local abierto sin distrito se excluye. Las categorías pueden solaparse. No se utilizan las coordenadas ni se trasladan estos recuentos a barrios o viviendas.
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

La ficha conserva el precio mensual del anuncio. Cuando el predictor XGBoost v3 devuelve una estimación válida, la aplicación compara esa mensualidad con una renta derivada del valor de venta estimado a nivel de 2025 y ratios distritales de 2024:

`renta_mensual_estimada = precio_estimado × factor_renta_mensual`

La renta derivada no tiene validación independiente de alquiler ni intervalos calibrados. Fair no aporta puntos con este modelo, que no devuelve bandas. Si el servicio no está disponible o se abstiene, se indica la ausencia de estimación. El bloque «Cómo estimamos el alquiler» de `/datos` explica este método; no certifica que el servicio esté conectado. [Contrato del predictor](modelo-xgboost.md).

## Metodología prevista de Zone Score

Estado: pendiente de implementación. La propuesta combina cinco componentes con igual peso interno, un 20% cada uno. Estos pesos son distintos de γ, el peso que el usuario asigna a Zone dentro del HabitIA Score.

`Zone = 100 × (I_verde + I_actuaciones + I_transporte + I_servicios + I_descanso) / 5`

Cada índice se expresaría entre 0 y 1 mediante el rango percentil del indicador entre territorios comparables. Para actuaciones y ruido, la propuesta utiliza `1 − percentil(valor)`, calculado sobre la misma distribución del indicador original. Una puntuación relativa no acredita una medida validada de calidad de vida.

| Componente | Sentido propuesto | Preparación pendiente |
| --- | --- | --- |
| Verde | Más dotación verde, mayor índice | Elegir superficie verde por habitante o proporción de superficie, comprobar cobertura y mantener unidades consistentes |
| Actuaciones | Menos actuaciones, mayor índice | Definir categorías, periodo y ajuste por población; justificar su interpretación sin equiparar menos actuaciones con mayor seguridad |
| Transporte | Más líneas distintas, mayor índice | Definir los modos incluidos, la asignación a distritos y la deduplicación de líneas |
| Servicios | Más servicios, mayor índice | Acordar categorías, evitar duplicados por solapamiento y ajustar los recuentos para comparar distritos |
| Descanso | Menos ruido nocturno, mayor índice | Extraer y agregar los valores de ruido nocturno del mapa; documentar la cobertura y el periodo |

La preparación se plantea por distrito, escala de varias de las fuentes disponibles. Los datos por barrio pueden agregarse cuando corresponda, pero no se repartirán cifras de distrito para presentarlas como mediciones de cada barrio. Quedan por acordar la distribución de referencia, el tratamiento de empates, los periodos comparables y la política ante componentes ausentes.

La fórmula documentada no se ejecuta. Hasta completar los datos y la implementación, `personalScore` mantiene Zone en `null`, su aportación es cero y su peso no se redistribuye. La fórmula y su estado se explican también en `/como-funciona#zone-score`.

Los datos originales de entrenamiento y los artefactos del modelo pertenecen a la entrega separada de la memoria: [Servicio externo](modelo-externo.md).
