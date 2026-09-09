# Estado verificado de la revisión de HabitIA

Revisión local del 9 de septiembre de 2026. Los cambios de producto del documento «Dudas mauri v3» están implementados en el repositorio. Las decisiones completas se encuentran en `../respuestas-dudas-mauri-v3.md`.

## Comprobaciones completadas

| Comprobación | Resultado |
| --- | --- |
| TypeScript estricto y ESLint | Sin errores ni advertencias |
| Compilación Next.js de producción | Correcta, copia aislada sin claves ni proveedores de pago |
| Regresiones existentes de la app | 68 comprobaciones correctas |
| Pesos, scoring, filtros y última búsqueda | 12 comprobaciones nuevas correctas |
| Calculadora | 15 grupos correctos, incluidos 324 escenarios |
| Fuentes de mercado | Lectura por código de serie, periodos independientes, datos ausentes, formatos INE/BdE y cronología correctos |
| API de notificaciones | 10 grupos correctos, sin llamadas externas |
| Programación PostgreSQL | 23 comprobaciones correctas en una base local desechable; transacción con rollback |
| Interfaz de notificaciones | 13 comprobaciones con API y avisos simulados; sin permisos ni envíos reales |
| Revisión visual | Escritorio 1280 px y móvil 390 px; sin desbordamiento de página ni errores JavaScript |

Las pruebas de interfaz comprobaron suma100 obligatoria, edición sin consultas automáticas, confirmación antes de buscar, recuperación después de recargar, búsqueda vacía que sustituye a la anterior, detalles de score, costes de calculadora, sensibilidad, configuración del horario y reintento real de guardado. Las capturas y los registros se conservan junto a este archivo y en `../pruebas_2026-09-09/`.

Se verificaron las descargas oficiales disponibles del INE, MIVAU y Banco de España. Eso no valida las referencias ilustrativas de alquiler ni crea indicadores de seguridad por barrio. Las pruebas del scoring y las finanzas son de comportamiento y consistencia, no una validación empírica del éxito de las recomendaciones.

## Publicación y cron verificados

La migración `20260909150000_daily_notifications.sql` se aplicó al proyecto remoto `ggahjicfmsbpyhequpck` después de iniciar sesión con la cuenta del TFM. Se verificaron ambas tablas, RLS habilitado y ausencia de acceso público al proceso de ejecución. La versión `cff7d3cc96bd740c2353cb389c041cb1ace070ae` se publicó correctamente mediante la integración GitHub/Vercel en [HabitIA](https://habitiaucm.vercel.app/notificaciones).

El trabajo `habitia-daily-recommendations` está activo y comprueba cada minuto si hay suscripciones pendientes. Cron History registró ejecuciones correctas a las 15:27 y 15:28 UTC del 9 de septiembre de 2026. Una petición de comprobación enviada desde Supabase mediante `pg_net` y las credenciales de Vault devolvió HTTP 200, el proyecto correcto y la versión esperada del proceso. La ruta rechaza peticiones sin autorización con HTTP 401.

La página y su API pública devolvieron HTTP 200. Una bandeja nueva empieza desactivada, a las 07:00 Europe/Madrid, sin perfil ni resultados; su cookie tiene los atributos HttpOnly, Secure y SameSite Strict y las respuestas privadas no se cachean. No había suscripciones activadas durante estas comprobaciones, por lo que no se ejecutó una búsqueda de pago ni se verificó una entrega real de anuncios. La evidencia se conserva en `production-verification.json`. Consulte `../notificaciones.md` para operación y límites.

La bandeja funciona por navegador. El aviso opcional requiere la aplicación abierta; no se implementó correo ni Web Push. Esta distinción se muestra en la pestaña y en la documentación.

## Memoria

Se añadió `../memoria/revision_2026-09-09_producto.md` (ruta desde la raíz de la app) y un enlace en el README de la memoria. No se regeneraron los DOCX/PDF ni se modificaron los resultados del modelo de 2018.
