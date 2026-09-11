# Fuentes urbanas incorporadas

`urban-sources.json` es una instantánea de contexto para `/datos`. No alimenta el Zone Score ni atribuye métricas a una vivienda.

- **CRTM, Metro:** consulta de la capa `M4_Estaciones` (GeoServicio oficial enlazado desde el catálogo del Consorcio), 11-09-2026. Se conservan los 293 registros devueltos. La página muestra 240 estaciones con nombre y código municipal 079; omite dos registros sin nombre y los de otros municipios. Las líneas son las declaradas por el catálogo, sin prometer servicio activo ni frecuencias. No se agregan autobuses, Cercanías o Metro Ligero. URL y condiciones de reutilización en el JSON.
- **Censo municipal:** fichero de actividades descargable del 11-09-2026, con fecha de carga 10-09-2026 en todas sus 225.615 filas. Solo se cuentan locales cuya situación censal es `Abierto`, deduplicados por `id_local`, categoría y distrito. Un local abierto sin distrito se excluye. Las categorías pueden solaparse. No se utilizan las coordenadas ni se trasladan estos recuentos a barrios o viviendas.
- **Ruido:** enlace al mapa municipal MER 2021 y a su descarga TIF. Se identifica como ruido de tráfico, con indicadores Ld, Le, Ln y Lden. No se descargan ni interpretan píxeles como decibelios individuales: el usuario consulta la cartografía original. No es una medición actual de tranquilidad ni de ruido doméstico.

## Categorías censales

- Alimentación: epígrafes que empiezan por `4711` o `472`, excluyendo `472601` (estancos).
- Farmacias: `477301`.
- Gimnasios: `931008`.
- Ocio nocturno y espectáculos: `563002`, `563003`, `563007`, `932004`, `932005`, `932006` (bares especiales, cafés espectáculo, salas de fiesta, discotecas y salas de baile). No equivale a toda la hostelería ni a afluencia nocturna.

El JSON conserva el diccionario de epígrafes efectivamente incluidos, URLs, fechas y SHA-256 de los ficheros consultados. El CSV original no se versiona por su tamaño (125 MB); el importador permite recuperarlo de la URL fechada mientras la fuente lo mantenga.

## Reproducción

`python3 scripts/import-urban-sources.py [directorio-cache]`

El directorio contiene `actividades` (CSV) y `metro-stations.json` (respuesta de la capa). Si faltan, se descargan. El script comprueba distritos, duplicados contradictorios, fecha censal, coordenadas de Metro y que la respuesta no esté truncada. Para cambiar de instantánea hay que revisar URLs, fechas y controles de cobertura, no sobrescribir solo la fecha de consulta. El servicio Metro es mutable; para reproducir su misma huella se necesita conservar la copia consultada.
