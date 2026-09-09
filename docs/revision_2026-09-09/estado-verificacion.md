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

## Activación externa pendiente

La migración `20260909150000_daily_notifications.sql` se aplicó al proyecto remoto `ggahjicfmsbpyhequpck` después de iniciar sesión con la cuenta del TFM. Se verificaron ambas tablas, RLS habilitado y ausencia de acceso público al proceso de ejecución. No se activó ninguna suscripción de usuario. La publicación de la app y la conexión final del cron están en curso.

La activación restante requiere desplegar esta versión en el proyecto de HabitIA y ejecutar la configuración del cron con el mismo secreto de servidor. El instalador valida la identidad del proyecto desplegado mediante una comprobación que no consulta Idealista. No se configuró un trabajo contra una ruta inexistente ni contra otro proyecto. Consulte `../notificaciones.md`.

La bandeja funciona por navegador. El aviso opcional requiere la aplicación abierta; no se implementó correo ni Web Push. Esta distinción se muestra en la pestaña y en la documentación.

## Memoria

Se añadió `../memoria/revision_2026-09-09_producto.md` (ruta desde la raíz de la app) y un enlace en el README de la memoria. No se regeneraron los DOCX/PDF ni se modificaron los resultados del modelo de 2018.
