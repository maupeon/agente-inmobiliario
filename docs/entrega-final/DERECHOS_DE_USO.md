# HabitIA · Equipo 7 · Fuentes y derechos de uso

Este documento identifica las condiciones verificadas de las fuentes utilizadas. No asigna una licencia general a todos los datos: cada fuente conserva sus condiciones. La disponibilidad pública de un archivo no equivale por sí sola a una autorización de redistribución.

## 1. Histórico de anuncios de 2018: idealista18

Autores: David Rey-Blanco, Pelayo Arbués, Fernando A. López y Antonio Páez. El [repositorio original](https://github.com/paezha/idealista18), su [DESCRIPTION](https://raw.githubusercontent.com/paezha/idealista18/master/DESCRIPTION) y su [LICENSE.md](https://github.com/paezha/idealista18/blob/master/LICENSE.md) identifican la base y su licencia **Open Database License (ODbL) 1.0**.

La licencia requiere atribución y conservación de sus avisos. Las bases derivadas utilizadas públicamente están sujetas a las condiciones de compartir igual y de ofrecer la base o el método de transformación de los apartados 4.4 y 4.6 del [texto de ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). La licencia de la base no concede derechos sobre cada fotografía, marca u otro contenido individual.

**Atribución:** Este trabajo utiliza información de *idealista18*, de David Rey-Blanco, Pelayo Arbués, Fernando A. López y Antonio Páez, publicada bajo ODbL 1.0. La limpieza, selección de viviendas, agregación e incorporación de indicadores se documentan en los cuadernos y el código del [repositorio del modelo](https://github.com/tomasper17/house-pricing-model-habitia/tree/b51fdef423bf42b19427216bf06fdbeb031016d5). El anexo 13 de la memoria describe su ejecución.

## 2. Datos municipales con CC BY 4.0 verificada

Las fichas siguientes indican [Creative Commons Atribución 4.0 Internacional](https://creativecommons.org/licenses/by/4.0/deed.es):

- [Índice de vulnerabilidad territorial](https://datos.madrid.es/dataset/300301-0-ranking-vulnerabilidad).
- [Población por distrito y barrio](https://datos.madrid.es/dataset/300557-0-poblacion-distrito-barrio).
- [Incidencias recibidas en la Emisora Central de Policía Municipal](https://datos.madrid.es/en/dataset/837676-0-incidencias-recibidas-en-la-emisora-central-de-policia-municipal/resource/837676-2-incidencias-recibidas-en-la-emisora-central-de-policia-municipal).

**Atribución:** Origen de los datos: Ayuntamiento de Madrid. Elaboración propia: selección de indicadores, agregaciones territoriales y cálculo de tasas por población. No se implica respaldo institucional.

La reutilización debe conservar la atribución, el enlace a la licencia, la identificación de las transformaciones y los metadatos disponibles. Las fechas de referencia de las series se documentan en la memoria y en los artefactos; no son fechas de publicación de la aplicación. También deben respetarse las [condiciones generales del portal municipal](https://datos.madrid.es/pages/condiciones-generales-ayuntamiento-de-madrid), incluida la prohibición de reidentificación.

## 3. Cartografía censal de origen INE

El [aviso de reutilización del INE](https://www.ine.es/ss/Satellite?L=0&c=Page&cid=1254735849170&p=1254735849170&pagename=Ayuda/INELayout) permite reutilizar la información cuya fuente original sea el INE, con fines comerciales y no comerciales. Exige no desnaturalizarla, citar la fuente, conservar la última actualización cuando figure y no sugerir participación o patrocinio institucional. Esta autorización no se extiende automáticamente a información de terceros alojada en el portal.

**Atribución:** Elaboración propia con datos extraídos del sitio web del INE: www.ine.es. Se utilizan secciones censales de 2018, según la procedencia documentada en la memoria.

## 4. SERPAVI y series de compraventa

Las fuentes se identifican en el [portal municipal de mercado de la vivienda](https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Estadistica/Areas-de-informacion-estadistica/Edificacion-y-vivienda/Mercado-de-la-vivienda/?vgnextchannel=22613c7ea422a210VgnVCM1000000b205a0aRCRD). El [aviso legal municipal](https://www.madrid.es/portales/munimadrid/es/Inicio/Aviso-Legal/Aviso-legal/?vgnextchannel=8a0f43db40317010VgnVCM100000dc0ca8c0RCRD&vgnextfmt=default&vgnextoid=ce3e1e7b0f578010VgnVCM100000dc0ca8c0RCRD) permite la reutilización de información propia con atribución, pero distingue los contenidos de terceros.

No se ha acreditado una licencia específica de redistribución irrestricta para las tablas SERPAVI ni para la serie registral concreta utilizadas. Por ello, no se les atribuye automáticamente CC BY 4.0. Deben conservarse el Ayuntamiento como vía de acceso, el organismo de origen que conste en cada tabla, su periodo de referencia y sus condiciones específicas. El ZIP no incorpora nuevas copias de las tablas originales; conserva los artefactos de inferencia ya documentados, que incluyen indicadores derivados. Su inclusión no constituye una concesión de derechos sobre las fuentes subyacentes.

## 5. Anuncios actuales consultados mediante la API de Idealista

El [acceso oficial a la API](https://developers.idealista.com/access-request) requiere solicitar una clave. Los [términos generales de Idealista](https://www.idealista.com/ayuda/articulos/terminos-y-condiciones-generales-de-idealista/) contemplan condiciones particulares para los servicios y reservan derechos sobre sus contenidos.

No se han revisado las condiciones particulares de la cuenta del equipo. No se afirma permiso para redistribuir respuestas de la API, fotografías, descripciones ni exportaciones completas. La licencia de *idealista18* no cubre automáticamente esos anuncios actuales.

El ZIP incluye código e instrucciones, sin credenciales ni exportaciones de anuncios actuales. Las integraciones requieren credenciales propias. Las capturas de prueba con anuncios ficticios están identificadas como ejemplos sintéticos; no deben presentarse como observaciones del mercado.

## 6. Alcance del paquete

`VERSIONES.json` identifica las revisiones del código y las huellas de los seis artefactos de inferencia. `SHA256SUMS.txt` permite comprobar los archivos distribuidos. El código conserva los avisos de sus repositorios y dependencias; este documento no los sustituye. Antes de reutilizar o redistribuir materiales procedentes de fuentes con condiciones pendientes de acreditar, corresponde comprobar el permiso aplicable a ese uso concreto.
