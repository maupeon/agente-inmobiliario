# Selección diaria de viviendas

[Volver al README](../README.md)

La app incorpora `/notificaciones`, una bandeja por navegador y un horario editable. Empieza desactivada y propone las 07:00 de España peninsular; se pueden elegir Canarias u otras zonas. Guardar y activar autoriza una búsqueda diaria, copia el perfil actual al servidor y mantiene los mismos límites de caché y cuota que el buscador. Las preferencias de perfil modificadas después deben guardarse en Notificaciones.

La selección contiene como máximo cinco anuncios distintos, ordenados por el mismo HabitIA Score. No completa con viviendas ficticias cuando faltan candidatos. El resultado vacío se conserva como tal; un error no se presenta como búsqueda sin resultados. Las peticiones diarias no utilizan la narración adicional del LLM. Los anuncios pueden proceder de la caché de 24 horas y los escenarios demo están identificados.

## Instalación

Prepara primero Supabase siguiendo [Configuración](configuracion.md). Para habilitar la selección diaria en esa instalación:

1. Aplicar `supabase/migrations/20260909150000_daily_notifications.sql` y después `supabase/migrations/20260910120000_five_daily_recommendations.sql`. La segunda amplía a cinco tanto la restricción de tabla como la validación de la función de entrega. Ambas deben estar aplicadas antes de ejecutar el trabajador actual.
2. Desplegar la app con `CRON_SECRET` de al menos 24 caracteres aleatorios. El secreto solo se configura en servidor. El servicio debe tener sus variables actuales de Supabase, Idealista y valoración.
3. Configurar `NEXT_PUBLIC_SITE_URL` con el origen HTTPS canónico de la app. Guardar en Supabase Vault `habitia_app_url` con ese origen y `habitia_cron_secret` con el mismo secreto.
4. Aplicar `supabase/setup/notifications-cron.sql`. Crea un único trabajo `habitia-daily-recommendations` que revisa cada minuto si existe alguna suscripción pendiente. Solo entonces solicita el proceso protegido de la app.
5. Verificar en Cron History y en la bandeja de una suscripción de prueba. No dar por operativo el envío únicamente porque la migración se haya aplicado.

El instalador `node scripts/setup-notifications.mjs --check`, `--migrate`, `--upgrade-five` y `--activate-cron` permite ejecutar esos pasos con la sesión administrativa de Supabase CLI en macOS o con `SUPABASE_ACCESS_TOKEN` en el entorno. Verifica que el proyecto coincide con `NEXT_PUBLIC_SUPABASE_URL`, no muestra credenciales y rechaza activar cron si el endpoint desplegado no está listo o utiliza otro proyecto Supabase. La comprobación autenticada `?check=1` solo verifica disponibilidad e identidad del proyecto: no reserva trabajo ni consulta proveedores. La clave `service_role` de la app no concede acceso a la API administrativa.

El instalador usa la API administrativa y verifica el esquema directamente; no registra versiones en el historial de migraciones de Supabase CLI. Si se adopta `supabase db push`, reconciliar primero las migraciones históricas aplicadas, sin repetir cambios a ciegas.

## Horario y errores

PostgreSQL calcula la siguiente ocurrencia en la zona IANA elegida, incluidos los cambios de hora. Si una hora local no existe por el paso a verano, se desplaza hacia delante. Cada llamada procesa una suscripción: varias personas con el mismo horario forman una cola; la hora indica a partir de cuándo comienza la preparación.

La reserva de cinco minutos impide que dos procesos tomen simultáneamente el mismo perfil. Los resultados solo se aceptan si conservan la reserva actual; pausar o editar invalida una ejecución en curso. Una clave única por navegador y fecha local impide duplicados. Los fallos se reintentan a los quince minutos, hasta tres intentos al día, incluidos los procesos que terminen inesperadamente. Se puede consultar el último error en la pestaña.

La cuota global mensual de Idealista sigue aplicándose. Las notificaciones no reservan una cuota propia: si se agota, no hay nuevas búsquedas reales hasta que vuelva a haber disponibilidad. Consultas equivalentes pueden compartir la caché.

## Privacidad y canal

La identidad de esta bandeja es un secreto aleatorio en cookie HttpOnly, SameSite Strict y Secure en producción; el servidor conserva solo su hash. Cada consulta filtra por ese hash y no acepta un identificador de usuario enviado en el cuerpo. El historial global de la demo sigue siendo independiente. Las respuestas privadas no se cachean y las escrituras requieren origen de la app y JSON.

No hay cuenta ni sincronización entre dispositivos. Borrar la cookie impide recuperar esta bandeja. Las suscripciones dejan de ejecutarse después de 90 días sin guardar la configuración; esa caducidad no equivale al borrado de los datos existentes. Se muestran los 30 resúmenes más recientes.

El canal disponible es la bandeja. El aviso opcional del navegador pide permiso mediante una acción explícita y funciona con HabitIA abierta. No es Web Push y no envía correos; la selección permanece en el servidor aunque la app esté cerrada.

## Verificación

- `node --test tests/notifications-api.test.cjs`: autorización del cron, identidad privada, filtrado por propietario, validación, origen, selección de cinco únicos y errores de proveedor, sin red.
- `psql ... -f supabase/tests/notifications.sql`: ejecutar en una base local desechable tras aplicar la migración; usa una transacción con rollback. Comprueba horario estacional, Canarias, permisos, reservas, pausas, duplicados y reintentos.
- `npm run check`: pruebas de la aplicación, tipos, lint y compilación.

Fuentes de implementación: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart) y [programación con Vault y pg_net](https://supabase.com/docs/guides/functions/schedule-functions).
