# Correcciones de la aplicación — 8 septiembre 2026

Cambios locales para alinear la demo con la evidencia del TFM. No se han desplegado, no se han añadido servicios de pago ni se han ejecutado migraciones remotas. La presentación conserva diseño, animaciones y resultados anteriores como antecedentes exploratorios. Su recorrido principal incorpora exclusivamente las cifras del experimento terminado, con su origen y hash.

## Privacidad y continuidad del chat

- Conversaciones y favoritos pasan a almacenamiento del navegador. No se usa un `userId` enviado por el cliente para autorizar acceso a datos remotos.
- `/api/conversations` y todos los métodos de `/api/favorites` devuelven 410 y no consultan la base de datos. El chat deja de escribir conversaciones, mensajes y analítica personal en Supabase.
- Un único identificador local se mantiene entre turnos. Se conservan mensajes, resultados de herramientas y tarjetas, incluidas las valoraciones de compra. Historial limitado a 20 conversaciones/40 mensajes por conversación y favoritos a 100 elementos.
- La interfaz informa del almacenamiento local y del envío del mensaje/perfil a Anthropic. Permite borrar el historial. Cada perfil de navegador comparte sus datos locales; no constituye una cuenta ni un aislamiento entre personas que usen el mismo perfil.
- Se preparó una migración que activa RLS y retira permisos de `anon`/`authenticated` sobre tablas privadas. **Los datos antiguos de Supabase no se han borrado ni se ha verificado/aplicado esta migración en remoto.** Cerrar las rutas locales no acredita por sí solo que la base ya desplegada esté protegida.

## Contrato y explicación del modelo

- Se preservan `detailedType` y `municipality` desde la respuesta de Idealista hasta el modelo. No se transforma «última planta» en «ático».
- Las habitaciones desconocidas se mantienen ausentes en búsqueda, chat y adaptador del modelo; no se convierten en cero. La interfaz distingue «sin dato» de cero habitaciones observadas.
- El cliente exige compra, Madrid capital, tipología de piso admitida, superficie 20–1.000 m² y una comprobación geográfica preliminar. El backend verifica su soporte espacial; la caja del cliente no sustituye un polígono municipal.
- Se mantienen resultados y abstenciones por anuncio: `ok`, `fuera_ambito`, `datos_insuficientes` y `no_disponible`. Una respuesta parcial ya no oculta por qué faltan valoraciones.
- Panel y nueva herramienta de chat `valorar_vivienda` usan `valorarLoteConEstado`. No existe una segunda fórmula de compra en el chat. La herramienta solicita además la explicación SHAP opcional y muestra hasta tres contribuciones como atribuciones del modelo, sin interpretarlas como efectos causales o euros sumables.
- Se envía `renivelar: true` explícitamente para comparar anuncios actuales; se identifica como **escenario indexado desde precio anunciado de 2018**. Se exige versión 2.x, identificador del modelo revisado, objetivo y periodo correctos, extrapolación explícita, precisión actual y clasificación no validadas, factor positivo y punto dentro del intervalo. Una respuesta heredada se rechaza. Tampoco se aceptan códigos no solicitados ni resultados duplicados.
- Se retiran las afirmaciones de error actual «8,8 %», «9 de cada 10 viviendas así» y «por debajo de lo explicable». Estar debajo del intervalo no acredita una ganga ni una ganancia de inversión.
- Si el modelo falla, se explica la incidencia y, cuando existe, se muestra una referencia territorial verificada claramente distinta. No se calcula banda ni diferencia individual a partir de ese respaldo; tarjetas y marcadores quedan neutros.

## Fuentes, recomendaciones y fallbacks

- Anuncios mock marcados como `sourceKind: demo`, con etiqueta visible en tarjetas y panel y procedencia en el resumen para el LLM.
- La revisión visual detectó que los mocks usaban `pisos` como tipología: se corrigieron a `flat` con municipio y subtipo coherentes. Se sustituyeron fotos aleatorias por una ilustración local etiquetada y se retiraron los enlaces ficticios a Idealista, también en ficha y favoritos. El detalle conserva los datos de búsqueda.
- Los fixtures de precios, índices, tipos y alquiler se describen como ilustrativos sin validación documental. No alimentan valoraciones ni ranking como si fueran observaciones oficiales.
- Caché de mercado conserva procedencia en el JSON; las filas antiguas sin esa trazabilidad se consideran respaldo no verificado. Un refresco que devuelve fixture no reemplaza el último dato oficial guardado.
- Se valida que la serie IPV contenga cuatro trimestres distintos, fechas interpretables y valores finitos. Ante ambigüedad se abstiene y usa respaldo etiquetado; no se convierte un valor ausente en cero.
- Los índices manuales de seguridad/calidad de vida se retiran del informe, ranking y sugerencias. No se resuelven barrios homónimos mediante substring. Las referencias históricas de fixtures quedan en código/documentación como material ilustrativo.
- El ranking excluye incumplimientos explícitos de imprescindibles y señala datos desconocidos. Usa hasta ocho candidatos recuperados, no todo el mercado.
- La geometría de transporte público sigue siendo aproximada aunque se obtenga una ruta de carretera.
- El contexto provincial documenta fuente y periodo y no calcula otra banda/porcentaje individual; los fixtures quedan excluidos también cuando el modelo responde. Las imágenes ausentes en anuncios reales usan un marcador neutro, sin fotografías aleatorias.

## Consumo y validación de entradas

- Nueva reserva mensual atómica de Idealista mediante función SQL: bloqueo transaccional, comprobación y registro antes del `fetch` pagado. Máximo configurado hasta 100 intentos mensuales; los fallidos también consumen reserva de forma conservadora.
- Sin Supabase/función de reserva o si hay error, las búsquedas nuevas fallan cerradas. No se dispara el proveedor sin poder comprobar cuota. Los mocks y resultados cacheados siguen disponibles.
- Caché de búsqueda de 24 horas, clave de parámetros mediante SHA-256, persistencia SQL opcional y deduplicación de solicitudes simultáneas dentro del proceso. La reserva de cuota sí se serializa entre instancias; el mapa de promesas no es una caché distribuida.
- Proxy de valoración limita el cuerpo y los lotes a 24 anuncios; valida datos y aplica rate limit. Chat limita 20 mensajes, 8.000 caracteres por mensaje y 32.000 del historial, con comprobación real del tamaño del cuerpo.
- Agente acotado a 3 rondas, 4 herramientas y 1.600 tokens de salida por ronda. Sin reintentos automáticos del SDK; deadline y cancelación del stream se propagan a Anthropic. Uso de tokens registrado sin contenido de conversaciones.
- `LLM_ENABLED=false` permite pausar el chat. Narración adicional del panel desactivada por defecto; requiere `LLM_INSIGHTS_ENABLED=true`.
- Timeouts para OAuth/Idealista, fuentes de mercado, transporte, Supabase y valoración. El rate limit es **por proceso**, se reinicia y no garantiza un presupuesto monetario global o distribuido para Anthropic. No se afirma que el coste total esté limitado a una cifra.

## Calculadora

- Ganador calculado con la diferencia de patrimonio final al horizonte elegido, también si las curvas se vuelven a cruzar.
- Texto del equilibrio identifica el primer cruce y admite cruces posteriores.
- Exención de la ganancia separada de «vivienda habitual»: supuesto explícito `exencionGananciaVenta`, desactivado por defecto. No se presenta como determinación automática de elegibilidad fiscal.

## Verificación

- `node docs/auditoria_2026-09-08/app_regression.cjs`: 50 comprobaciones offline con red bloqueada, stubs y cero escrituras externas. Incluye 324 escenarios de patrimonio final, aislamiento de rutas, estabilidad de identificador, rehidratación de tarjetas, validación, rechazo de contratos heredados/incompatibles, códigos ajenos, duplicados e intervalos inválidos, abstención del modelo, habitaciones ausentes y cero, mocks dentro de ámbito, neutralidad del respaldo territorial y modelo correcto junto a fixture no verificado, adaptación de subtipo, cuota antes de red, caché concurrente y filtros imprescindibles.
- `npx tsc --noEmit --incremental false` y `npm run lint` pasan.
- Build de producción aislado, sin `.env` ni credenciales: 20 páginas generadas. Última compilación `/private/tmp/habitia-final-review.n87ohrsw`; servidor local `http://127.0.0.1:3009` con mocks, ambos LLM desactivados y backend local en 8018. Las compilaciones anteriores en 3007/3008 se mantuvieron durante la revisión para evitar modificar un servidor en ejecución.
- `app_http_final.json`: proxy de valoración HTTP 200 con v2.0.0, conversaciones/favoritos HTTP 410 y chat pausado HTTP 503 en la compilación final. Una respuesta real del backend local con SHAP también supera las guardas de la app.
- `presentation_verification.json`: hash, métricas de tres modelos, artefacto, temporal, particiones, normalización SHAP y límites de segmentos coinciden con el JSON final.
- No se ha llamado a Anthropic, Idealista ni Fly para probar estos cambios. La batería no demuestra un límite distribuido bajo carga ni valida parsers contra una nueva descarga oficial, políticas ya instaladas en la base remota, una sesión real de streaming o la apariencia en navegador.

## Presentación y reproducción

- `results-legacy.json` conserva los resultados previos; se muestran únicamente en pestañas de antecedentes con advertencia de selección sobre histórico explorado.
- `results-data.json` permite estado pendiente y se ha sincronizado con el experimento terminado; SHA-256 `714a907424475d3b77ed715f93d2d811f0cb803249a8a69a946fd27e8b87c790`. La presentación explica agrupación por activo, protocolo exterior/interior 3×3, calibración separada, 25 variables compartidas y límites de la retrospectiva, manteniendo sus escenas y animaciones.
- `scripts/sync-model-results.py` importa el JSON final del experimento; exige los grupos completos, reconocimiento del histórico explorado y paridad de transformaciones, y registra SHA-256 y origen. No entrena ni publica resultados parciales. La importación final se ejecutó después de aparecer el JSON completo.
- Se han retirado del recorrido principal cifras económicas que no acreditaban ganancia, SHAP y errores heredados; las atribuciones nuevas se muestran como asociaciones del modelo en escala logarítmica, sin causalidad.
- La presentación diferencia cobertura por activo y por anuncio, añade IC descriptivo por bootstrap y publica límites: cobertura del decil más barato 81,81 % por anuncio y temporal 87,88 % por activo. El ejemplo del intervalo representa el ancho mediano observado (62,33 %), con etiqueta ilustrativa.
- Los dos vídeos previos se etiquetan visiblemente como grabaciones anteriores del concepto; se enlaza la demo en vivo para demostrar la revisión. No se regeneraron los vídeos.
- README y variables de ejemplo documentan migración, modo de demostración, pausas del LLM, presupuesto no garantizado y sincronización de resultados.

## Activación pendiente

Aplicar y comprobar `supabase/migrations/20260908_demo_privacy_quota.sql` antes de abrir búsquedas reales en esta versión. Desplegar la app y el backend compatible tras cerrar el experimento y revisar los artefactos. Mientras no se aplique la migración, la demo puede utilizar `MOCK_IDEALISTA=true`; las búsquedas reales nuevas se bloquearán de forma explícita. No activar pagos ni prometer disponibilidad sin verificar el despliegue.

