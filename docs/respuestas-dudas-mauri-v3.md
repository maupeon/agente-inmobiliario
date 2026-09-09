# Respuesta a las dudas de producto de HabitIA

Documento de origen: `Dudas mauri v3.docx`. Revisión: 9 de septiembre de 2026.

Las preguntas del documento se han tratado como requisitos de producto y puntos que explicar. Este registro distingue las mejoras de la aplicación, los datos realmente disponibles y la configuración de producción que todavía debe comprobarse. La documentación pública del método está en `/como-funciona` y en `docs/blog-como-funciona.md`.

## Perfil y buscador

| Duda | Respuesta y comportamiento |
| --- | --- |
| Pedir α, β, γ y δ al crear/editar el perfil | Cuatro pesos enteros entre 0 y 100, suma obligatoria 100, inicio 25/25/25/25. La validación se comparte entre perfil y API. |
| Orden por HabitIA Score y desglose | Orden descendente con Fair, Opportunity, Zone y Lifestyle; cada ficha muestra valor, peso, aportación y explicación. Cambiar pesos reordena la selección mostrada sin consultar Idealista. |
| Cuándo se renueva Idealista | Buscar confirma una consulta y genera recomendaciones. Consultas idénticas reutilizan anuncios durante un máximo de 24 horas; al caducar, la siguiente búsqueda consulta al proveedor. Una nueva ordenación no implica anuncios nuevos. |
| Sustituir «−12%» | La diferencia se expresa como un porcentaje por debajo/encima de la estimación. Se evita «lo que vale» porque la estimación parte de oferta de 2018 indexada y no tiene precisión contemporánea validada. |
| ¿Se usa el score Barrio? | Los índices manuales de seguridad y calidad de vida están retirados. Zone mide proximidad al punto elegido por el usuario, no esas características del barrio. |
| Falta referencia territorial en Detalles | La ficha distingue valoración individual y referencia territorial. La comparación territorial conserva fuente, ámbito y periodo cuando existen; si faltan, se explica en lugar de sustituirlos por ejemplos. |
| Botón Seguridad del mapa | Se retira el control y cualquier halo o puntuación sin datos verificables. La portada tampoco muestra el antiguo «Barrio 82/100». |
| Leyenda de precio | Barato, Justo y Caro, con colores distintos. Si no hay una estimación válida se muestra el estado sin valorar. Las etiquetas se refieren al escenario del modelo. |
| «Última búsqueda» no se guarda | Se guarda en el navegador una instantánea con filtros y resultados. Un resultado vacío sustituye al anterior; restaurarla no ejecuta una consulta. No es un historial sincronizado entre dispositivos. |

Los componentes sin dato aportan cero y no se redistribuyen los pesos. La cobertura muestra qué porcentaje de la ponderación dispone de componentes. Un score menor puede reflejar información ausente; el usuario ve ese límite junto al desglose.

## Acceso a Datos y fuentes

Datos y Notificaciones aparecen en la navegación global, incluido el menú móvil y la portada. La navegación utiliza un menú compacto cuando no caben todas las opciones. La sección de transparencia y el pie de la portada enlazan también a Datos.

| Duda | Respuesta y comportamiento |
| --- | --- |
| Trimestres «Q1 2025» | Un formateador de presentación convierte `2025T1` en `Q1 2025` sin alterar el formato interno utilizado por cálculos y caché. La página explica los cuatro trimestres. |
| Enlaces oficiales de benchmarks | Se enlazan MIVAU, INE y Banco de España junto a cada referencia. La fecha de consulta se distingue del periodo del dato. Un enlace oficial no convierte una cifra ilustrativa en un dato oficial. |
| Origen de Alquiler referencia | Los valores locales eran ejemplos manuales de demo, sin descarga oficial o muestra documentada. Se explica expresamente; no se atribuyen a SERPAVI. |
| Uso de la referencia de alquiler | Una referencia contrastada serviría para contextualizar €/m²/mes con ámbito y periodo. La integración oficial sigue pendiente; hoy las fichas indican que falta referencia y los ejemplos no clasifican el alquiler ni aportan Fair/Opportunity. |
| Desaparición de indicadores de barrio | Se mantiene su retirada por falta de fuente verificable a esa escala. La página explica por qué y distingue estos indicadores de la preferencia geográfica Zone y de la media territorial de precios. |

Durante la verificación se corrigió también la lectura de `T3_Periodo` en el INE, su selección nacional y el orden cronológico. Las antiguas URLs del Banco de España devolvían HTML en lugar de CSV: se sustituyeron por los CSV oficiales actuales, seleccionando los códigos `DN_1TI2T0002` (TEDR de vivienda) y `D_1NBAF472` (Euríbor 12 meses), con periodo propio para cada indicador. La descarga de mercado tiene además un límite total de espera de nueve segundos.

Las tablas públicas omiten cifras cuando solo hay un respaldo ilustrativo o una copia sin procedencia verificada. Los respaldos se conservan internamente por compatibilidad, marcados como tales. Se han corregido además comentarios del código que los atribuían indebidamente a fuentes oficiales.

Fuentes primarias comprobadas:

- [MIVAU — Estadística de valor tasado de vivienda](https://www.mivau.gob.es/el-ministerio/observatorios-y-estadisticas/estadisticas/valor-tasado-vivienda), con [descarga XLS](https://apps.fomento.gob.es/boletinonline2/sedal/35101000.XLS).
- [INE — IPV, tabla 25171](https://www.ine.es/jaxiT3/Tabla.htm?t=25171).
- [Banco de España — Estadísticas de tipos de interés](https://www.bde.es/webbe/es/estadisticas/temas/tipos-interes.html).
- [MIVAU — Metodología SERPAVI 2026](https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03-18_Metodologia_SERPAVI.pdf). Referencia metodológica, integración pendiente.

## Cómo funciona

Se actualizan la página y el artículo para reflejar los cuatro componentes, los pesos elegidos por el usuario, las ausencias de datos, la caché de búsqueda, Última búsqueda, el estado de las fuentes y las notificaciones. Se elimina la explicación anterior que prometía medir seguridad/calidad de barrio. Se mantiene separada la explicación del precio individual del contexto provincial.

## Comprar frente a alquilar

La comparación mantiene dos escenarios que empiezan hoy. Se han eliminado del formulario y del cálculo las mudanzas y ventas intermedias, así como la rama de fiscalidad por destino al extranjero. Para comparar patrimonios se conserva una liquidación hipotética al final de cada año; sus gastos e impuestos están explicados y plegados en ajustes avanzados.

| Duda | Respuesta y comportamiento |
| --- | --- |
| Agrupar datos por función | Secciones diferenciadas de compra, hipoteca, alquiler y evolución del escenario. |
| Otros gastos iniciales en ambas opciones | Muebles, mudanza y otros desembolsos iniciales se incluyen por separado en compra y alquiler. Se tratan como gasto, sin valor residual recuperable. |
| Gastos de gestión | Se incorporan costes de gestión de compra y otros gastos anuales. No se presupone a cargo del inquilino la gestión inmobiliaria que corresponde al arrendador en un alquiler de vivienda. |
| Glosario | Definiciones con fuentes primarias para términos financieros, de tenencia e impuestos. |
| Destacar Compra y Venta en avanzados | Los grupos se distinguen con subtítulos y contexto. La venta es una liquidación hipotética de comparación. |
| Obra nueva | Se explica su efecto sobre los impuestos de adquisición; no equivale a usar el mismo gravamen de una vivienda de segunda mano. |
| Gastos de compra y venta | Los de compra son desembolsos iniciales. Los de venta se usan únicamente al calcular el patrimonio liquidable hipotético, con supuestos editables. |
| Plusvalía municipal | Se incorpora en los supuestos de liquidación y se explica que su cálculo real depende del municipio y del terreno. |
| IBI anual | Etiquetado como coste anual de tenencia, con ayuda y referencia. |
| Comunidad | Se renombra a «Gastos de comunidad». |
| Mantenimiento y fuente | El 1% es un ejemplo editable, no una estimación avalada para cada vivienda. Se calcula sobre el precio inicial y después crece con la inflación de los gastos. |
| Simular exención de ganancia | Se explica como un supuesto fiscal condicionado a los requisitos aplicables; marcarlo no acredita que exista derecho a la exención. |
| Vivienda habitual | Su efecto fiscal se explica en los supuestos de la liquidación hipotética. |
| Inflación de costes de tenencia | Aumento anual supuesto de gastos como mantenimiento y otros costes de propiedad, separado de la revalorización de la vivienda. |
| Años hasta mudanza y fecha inicial de comparación | Se retira esta variable. Las dos alternativas empiezan hoy; no se modela entrada diferida al alquiler. |
| Mudanza fuera de la UE | Se retira la rama de mudanza/fiscalidad exterior, para no mezclarla con esta comparación. Si la API recibe un año de mudanza, muestra un aviso de que no ejecuta ese escenario; los campos antiguos de destino y estrategia no tienen efecto financiero. |
| Crecimiento salarial hasta 300% | Se permite hasta 300% como aumento total durante el periodo inicial de uno o dos años indicado, con explicación del supuesto. |
| Ingreso anual neto | Es el salario anual neto actual. Se usa para advertencias de esfuerzo, no como ingreso adicional que altere arbitrariamente el patrimonio comparado. |
| Precio / alquiler anual | Se explica que divide el precio de compra por doce mensualidades de alquiler: expresa cuántos años de renta equivalen al precio, antes de gastos e inversión. |
| Valor de alquilar en la barra | La cifra aparece al extremo de la barra gris de gastos acumulados del alquiler (renta, seguro y otros gastos). No es una barra de patrimonio. |
| Quitar venta/mudanza de la ecuación | Se retira la venta real intermedia y la mudanza. Se conserva la liquidación hipotética para que los patrimonios comparados incluyan costes e impuestos de forma consistente; está explicada y plegada. |
| Lo que el número no captura | Se mantiene el contexto cualitativo y se advierte del coste de comprar para marcharse al poco tiempo. |
| Revalorización cartera/vivienda y ventaja negativa | Ejes explícitos, cifra positiva de ventaja y etiqueta del ganador en cada celda. Se incluye el escenario exacto introducido por el usuario. |

Las hipótesis fiscales se apoyan en fuentes primarias incluidas en el glosario: [AEAT sobre IVA e ITP](https://sede.agenciatributaria.gob.es/Sede/iva/iva-operaciones-inmobiliarias/compro-vivienda-tengo-que-pagar-itp.html), [AEAT sobre reinversión de vivienda habitual](https://sede.agenciatributaria.gob.es/Sede/vivienda-otros-inmuebles/que-ocurre-cuando-vendo-inmueble/transmision-vivienda-habitual-reinversion.html), [escala del ahorro, Renta 2025](https://sede.agenciatributaria.gob.es/static_files/Sede/Actualidad/Notas_prensa/2026/PRESENTACION_CAMPANA_DE_RENTA_Y_PATRIMONIO_2025.pdf) y [artículo 20 de la LAU](https://www.boe.es/buscar/act.php?id=BOE-A-1994-26003#a20). La tasa superior del ahorro utilizada se actualiza al 30% desde 2025, y las ganancias de vivienda/cartera se agregan para evitar aplicar escalas por separado. El simulador sigue siendo una comparación de supuestos, no una liquidación fiscal individual.

## Notificaciones diarias

La pestaña `/notificaciones` contiene una bandeja privada y configuración de la selección diaria. El usuario activa voluntariamente la suscripción; la hora inicial es 07:00 y la zona Europe/Madrid, ambas editables. Se guardan hasta tres viviendas distintas ordenadas por el mismo HabitIA Score. Con menos candidatos se muestran los disponibles; sin resultados se explica, y no se crean viviendas ficticias para completar tres.

Al guardar se copia el perfil local al servidor. Los cambios posteriores se detectan y deben guardarse en Notificaciones para que se apliquen a la siguiente selección. La búsqueda diaria autorizada respeta la caché de 24 horas y los límites de consumo de Idealista. La suscripción caduca después de 90 días sin guardar; se puede pausar antes.

El canal implementado es la bandeja de la aplicación. El aviso del navegador es opcional y requiere permiso y la aplicación abierta. No se promete correo electrónico ni Web Push con la aplicación cerrada. El navegador se identifica mediante una credencial privada en cookie HttpOnly y el servidor conserva su hash; la bandeja no es una lista pública compartida ni una cuenta sincronizada entre dispositivos.

El trabajo diario impide duplicados mediante una reserva de ejecución. La edición y pausa invalidan ejecuciones anteriores, y los errores pueden reintentarse cada 15 minutos hasta tres intentos. Las migraciones y la configuración del cron quedan en el proyecto. La aplicación necesita que se apliquen y se verifique su ejecución en Supabase antes de dar el servicio por activado en producción.

## Memoria académica

La memoria vigente parte de la revisión del 8 de septiembre de 2026. Sus DOCX/PDF se generan desde `../memoria/src/revision_document_content.py` y `../memoria/src/build_revision_documents.py`; el apartado «9 Producto y arquitectura» es el punto natural de incorporación futura.

Se ha añadido `../memoria/revision_2026-09-09_producto.md`, enlazado desde el README de la memoria. Registra el ranking como regla de preferencias, la procedencia y ausencia de datos, la simplificación de la calculadora y las notificaciones, separando pruebas locales de activación remota. No modifica ni reinterpreta las métricas del modelo de precios de 2018, ni regenera los artefactos de entrenamiento.


## Verificación de Datos y navegación

`node scripts/test-market-data.cjs` comprueba códigos exactos de series, periodos distintos por indicador, huecos de publicación, rechazo de HTML, códigos duplicados, campos reales del INE, orden de trimestres y formato público. Se contrastó además el resultado con las descargas oficiales durante esta revisión.

Las páginas de portada, Datos, Cómo funciona y Notificaciones se comprobaron en un servidor aislado, sin credenciales ni llamadas a IA, en escritorio y a 390 px. No hubo desbordamiento horizontal ni overlays de error. Notificaciones se verificó también en estado de servicio no configurado; esta comprobación no acredita entrega real ni cron de producción.
