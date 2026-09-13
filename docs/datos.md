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

Si una fuente no puede verificarse, se muestra el respaldo o el dato ausente como tal. Los fixtures no se utilizan para presentar valoraciones individuales como evidencia oficial. La referencia de alquiler sigue sin una fuente validada integrada.

Los datos originales de entrenamiento y los artefactos del modelo pertenecen a la entrega separada de la memoria: [Servicio externo](modelo-externo.md).
