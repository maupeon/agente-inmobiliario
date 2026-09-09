# Cómo funciona HabitIA

Actualización de producto: 9 de septiembre de 2026. La página pública equivalente es `/como-funciona`. Los cambios del producto no modifican la evaluación del modelo de precios de 2018.

## Del perfil a las recomendaciones

1. El usuario elige compra o alquiler, zona, presupuesto, trabajo e imprescindibles. En el perfil reparte exactamente 100 puntos entre α Fair, β Opportunity, γ Zone y δ Lifestyle. Todos son enteros entre 0 y 100; el valor inicial es 25 para cada uno.
2. La búsqueda recupera candidatos de Idealista y descarta incumplimientos conocidos de requisitos obligatorios. Un atributo ausente no se considera automáticamente satisfecho ni incumplido: queda sin comprobar.
3. Se consulta la estimación individual del modelo y, por separado, las referencias territoriales disponibles. Se añaden ubicación y trayecto, con su procedencia y limitaciones.
4. Se muestran hasta cinco viviendas ordenadas de mayor a menor HabitIA Score. La ficha desglosa cada componente, peso, aportación y cobertura. El conjunto recuperado no representa todo el mercado.

## Qué calcula el HabitIA Score

`Score = (α × Fair + β × Opportunity + γ × Zone + δ × Lifestyle) / 100`

| Componente | Cálculo | Qué no demuestra |
| --- | --- | --- |
| α Fair | Bandas de precio individual: barato 100, ajustado 85, en línea 62, caro 32, muy caro 12. Requiere estimación válida, estado correcto y versión del modelo. | No es un precio de cierre observado ni una tasación actual validada. |
| β Opportunity | `limitar(50 + 200 × (límite inferior − precio) / límite inferior, 0, 100)`. Requiere intervalo individual válido. | No es una probabilidad de ganga o rentabilidad. |
| γ Zone | Distancia en línea recta al punto escogido: 100 puntos en el punto y descenso lineal hasta 0 a 3,5 km. | No es un indicador de seguridad, servicios o calidad del barrio. |
| δ Lifestyle | Media de señales disponibles de presupuesto, trayecto y requisitos comprobables. | No demuestra que todos los atributos desconocidos encajen. |

La contribución de cada componente se redondea a una décima y el total a un entero. Si falta una señal completa, su valor es nulo y su aportación es cero; su peso no se redistribuye. La cobertura es la suma de los pesos con componente disponible. Por ejemplo, sin Fair ni Opportunity y con pesos iguales, la cobertura máxima es 50%. La cobertura del componente Lifestyle no implica que se hayan comprobado todos los requisitos: su explicación señala los que faltan.

El valorador aprende precios de oferta de Madrid de 2018. El escenario indexado a otro periodo no dispone de evaluación independiente con anuncios contemporáneos. Barato, Justo y Caro expresan la posición del anuncio respecto a ese escenario. Una diferencia de precio se describe como «por debajo / por encima de la estimación», sin prometer que equivalga a ahorro real.

Una media provincial de €/m² tiene un propósito diferente: contexto territorial. No sustituye a la valoración individual ni proporciona Fair u Opportunity cuando el modelo se abstiene.

## Cuándo se renuevan las búsquedas

Confirmar una búsqueda aplica los filtros y el perfil a los candidatos disponibles. La misma consulta a Idealista puede reutilizarse durante 24 horas; al caducar la caché, una siguiente búsqueda consulta al proveedor. Cambiar los pesos reordena localmente los resultados mostrados sin consultar al proveedor. «Última búsqueda» conserva filtros y resultados, incluso una búsqueda sin coincidencias; recuperarla no lanza una consulta. La fecha de búsqueda no acredita que el anuncio siga disponible.

El acceso real depende de la configuración de Idealista y de sus límites de consumo. Los datos de demo y los errores del proveedor deben identificarse. El ranking y las explicaciones básicas se calculan de forma determinista. Si se activa narración opcional mediante IA, esta explica los resultados disponibles y puede equivocarse.

## Datos, periodos y fuentes

La página `/datos`, accesible desde el menú global y la portada, permite comprobar las fuentes y su periodo. Los trimestres se presentan como `Q1 2025`, `Q2 2025`, etc. El periodo del dato y la fecha de descarga son conceptos distintos.

| Fuente primaria | Uso |
| --- | --- |
| [MIVAU — Valor tasado de vivienda](https://www.mivau.gob.es/el-ministerio/observatorios-y-estadisticas/estadisticas/valor-tasado-vivienda) | Media territorial de tasaciones de vivienda libre en €/m². El [XLS oficial](https://apps.fomento.gob.es/boletinonline2/sedal/35101000.XLS) alimenta el adaptador histórico denominado `mitma.ts`. |
| [INE — IPV, tabla 25171](https://www.ine.es/jaxiT3/Tabla.htm?t=25171) | Variación de precios de compraventa, publicada trimestralmente. |
| [Banco de España — Tipos de interés](https://www.bde.es/webbe/es/estadisticas/temas/tipos-interes.html) | TEDR vivienda, serie DN_1TI2T0002 del cuadro 19.4, y Euríbor 12 meses, D_1NBAF472 del cuadro 19.1. Cada indicador conserva su mes. Una referencia agregada no sustituye la oferta del banco. |
| OpenRouteService | Rutas cuando el proveedor está disponible. Transporte público y respaldos se identifican como aproximaciones. |
| Nominatim / OpenStreetMap | Búsqueda de ubicaciones. La localización de un anuncio puede ser aproximada. |

Las cifras de alquiler de `lib/market/fixtures.ts` son ejemplos manuales, sin descarga oficial ni muestra documentada. No son un snapshot de SERPAVI. Su integración sigue pendiente; la [metodología oficial SERPAVI 2026](https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03-18_Metodologia_SERPAVI.pdf) se enlaza para consulta y describe el uso de fuentes tributarias. Los ejemplos no clasifican alquileres como baratos o caros ni aportan Fair u Opportunity.

Los índices manuales de seguridad y calidad de vida se retiraron por ausencia de una fuente verificable a esa escala. No existe una capa de seguridad ni se sustituyen por números inventados. Zone expresa la preferencia geográfica del usuario.

El lector del INE admite el campo `T3_Periodo` y ordena la serie nacional por trimestre. El lector del Banco de España selecciona códigos explícitos en los CSV oficiales; no elige una columna por su posición. Las consultas de mercado tienen un límite total de espera de nueve segundos.

La caché de mercado conserva los últimos valores con procedencia verificada si falla una actualización. En ausencia de copia se intenta consultar la fuente; si solo se obtiene respaldo ilustrativo, `/datos` omite las cifras. Un enlace oficial no convierte el contenido del respaldo en oficial.

## Selección diaria y privacidad

La pestaña `/notificaciones` permite activar voluntariamente una selección diaria de hasta tres viviendas distintas ordenadas por el mismo HabitIA Score, con hora inicial 07:00 y zona Europe/Madrid. La hora, zona horaria y activación se pueden editar. Si hay menos de tres candidatos, se muestran los disponibles; si no hay resultados, se explica. Pueden repetirse viviendas entre días si siguen siendo las más afines.

El canal es una bandeja privada dentro de la aplicación. La notificación del navegador es opcional, necesita permiso y la aplicación abierta; no es Web Push con la aplicación cerrada ni correo electrónico.

El perfil y la última búsqueda permanecen en el navegador. Las conversaciones y los favoritos de la demo se comparten en Supabase, separados de la bandeja privada de notificaciones. Guardar la configuración copia al servidor el perfil necesario para las recomendaciones y autoriza una búsqueda diaria, que respeta la caché y la cuota de Idealista. Los cambios posteriores del perfil deben guardarse expresamente en Notificaciones. La suscripción caduca a los 90 días sin guardar.

El acceso a los avisos usa una credencial privada del navegador en una cookie HttpOnly y el servidor conserva su hash. No supone sincronización entre dispositivos. Las ejecuciones están protegidas contra duplicados; pausa y edición invalidan trabajos anteriores. Los fallos se pueden reintentar cada 15 minutos, hasta tres intentos.

La programación requiere aplicar la migración de Supabase y configurar el cron del proyecto. La existencia de código y migraciones no certifica la activación remota: el estado operativo debe verificarse en el proyecto desplegado y se informa en la pestaña.

## Arquitectura y rutas

El navegador consulta las rutas Next.js de búsqueda, recomendación y enriquecimiento. Estas combinan Idealista, el servicio Python de valoración, las referencias de mercado y los trayectos. Supabase almacena caché, cuota técnica, conversaciones y favoritos compartidos de la demo y, tras activación, las suscripciones y avisos privados. El proceso programado utiliza el mismo ranking que el buscador.

Rutas principales: `/`, `/dashboard`, `/chat`, `/datos`, `/como-funciona`, `/comprar-o-alquilar` y `/notificaciones`.
