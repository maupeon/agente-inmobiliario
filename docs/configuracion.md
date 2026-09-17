# Configuración y despliegue

[Volver al README](../README.md)

La configuración se lee desde el entorno del servidor. En local, copia [`.env.example`](../.env.example) a `.env.local` y reinicia Next.js después de editarlo. En un alojamiento, configura las variables en el proyecto y vuelve a desplegar. Las variables `NEXT_PUBLIC_*` pueden incorporarse al navegador: nunca deben contener secretos.

## Variables

| Variable | Valor del ejemplo o comportamiento | Uso |
| --- | --- | --- |
| `MOCK_IDEALISTA` | `true` | Anuncios sintéticos; `false` permite consultas reales |
| `IDEALISTA_API_KEY` | Vacía | Clave del proveedor, solo servidor |
| `IDEALISTA_SECRET` | Vacía | Secreto del proveedor, solo servidor |
| `IDEALISTA_BASE_URL` | `https://api.idealista.com/3.5/` | Base de la API |
| `IDEALISTA_MONTHLY_LIMIT` | `100` | Límite de reservas mensuales, acotado a 100 |
| `LLM_ENABLED` | `false` en el ejemplo | Pausa el chat; para activarlo, usa `true` y una clave válida |
| `LLM_INSIGHTS_ENABLED` | `false` | Narración adicional opcional de recomendaciones; requiere `true` y LLM habilitado |
| `ANTHROPIC_API_KEY` | Vacía | Credencial de Anthropic, solo servidor |
| `ANTHROPIC_MODEL` | `claude-opus-4-6` | Modelo configurado para el chat |
| `INSIGHTS_MODEL` | `claude-sonnet-4-6` | Modelo para la narración adicional |
| `NEXT_PUBLIC_SUPABASE_URL` | Vacía | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vacía | Clave pública anon/publishable para el mando de la presentación por Realtime Broadcast |
| `SUPABASE_SERVICE_ROLE_KEY` | Vacía | Acceso a datos desde el servidor; nunca exponer al cliente |
| `VALORACION_URL` | Vacía | Origen del servicio Python; por ejemplo, `http://127.0.0.1:8000` |
| `VALORACION_TOKEN` | Vacía | Mismo token que el servicio Python |
| `VALORACION_TIMEOUT_MS` | `10000` | Espera entre 1 y 20 segundos |
| `ORS_API_KEY` | Vacía | OpenRouteService para trayectos compatibles |
| `MOCK_COMMUTE` | `true` | Fuerza trayectos aproximados; usa `false` para permitir ORS |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Origen canónico de la instalación; HTTPS en producción |
| `CRON_SECRET` | Vacía | Protege los procesos periódicos; mínimo 24 caracteres para notificaciones |

El [control de la presentación desde el celular](control-presentacion.md) utiliza `NEXT_PUBLIC_SUPABASE_ANON_KEY` y la URL pública del proyecto para Realtime Broadcast, sin tablas ni migraciones adicionales. Esa clave pública se incorpora al navegador durante la compilación; reinicia el servidor local o recompila el despliegue tras configurarla. Nunca uses la clave `service_role` en una variable pública. La presentación con teclado sigue funcionando si el mando no está configurado.

Para ejecutar el script administrativo de notificaciones, configura `SUPABASE_ACCESS_TOKEN` en su entorno; esa credencial administrativa no es necesaria en el servidor web.

## Supabase: instalación nueva

Utiliza una base Supabase de tu propia instalación. Desde su editor SQL, ejecuta estos archivos en orden:

1. [`supabase/schema.sql`](../supabase/schema.sql): esquema base, caché, reserva de cuota y tablas compartidas de la demo.
2. [`20260909150000_daily_notifications.sql`](../supabase/migrations/20260909150000_daily_notifications.sql): tablas y funciones de notificaciones, si vas a usar esa función.
3. [`20260910120000_five_daily_recommendations.sql`](../supabase/migrations/20260910120000_five_daily_recommendations.sql): amplía la selección a cinco viviendas.

Después, configura URL y clave `service_role` en el servidor y reinicia la aplicación. La existencia de los archivos SQL en GitHub no significa que ya estén aplicados en tu base.

El esquema base ya incorpora los cambios de cuota y demo compartida. Las tablas anteriores `conversations`, `messages`, `favorites` y `events` se conservan por compatibilidad y con acceso público retirado. La aplicación actual utiliza `demo_conversations`, `demo_messages` y `demo_favorites`; no importa conversaciones antiguas.

## Supabase: instalación existente

Comprueba qué cambios están aplicados y ejecuta únicamente los pendientes:

| Migración | Responsabilidad |
| --- | --- |
| [`20260908_demo_privacy_quota.sql`](../supabase/migrations/20260908_demo_privacy_quota.sql) | Cerrar acceso público a tablas anteriores, caché y reserva atómica de cuota |
| [`20260909_shared_demo_storage.sql`](../supabase/migrations/20260909_shared_demo_storage.sql) | Historial y favoritos globales de la demo |
| [`20260909150000_daily_notifications.sql`](../supabase/migrations/20260909150000_daily_notifications.sql) | Suscripciones privadas, reservas y entregas |
| [`20260910120000_five_daily_recommendations.sql`](../supabase/migrations/20260910120000_five_daily_recommendations.sql) | Límite de cinco viviendas en tabla y función |

Este repositorio documenta una instalación SQL manual. Si adoptas Supabase CLI, reconcilia primero su historial con las migraciones ya ejecutadas; no lances `db push` sobre una base existente sin esa comprobación.

## Idealista y control de consumo

Para usar anuncios reales, configura ambas credenciales, prepara Supabase y establece `MOCK_IDEALISTA=false`.

- Las búsquedas equivalentes usan una caché de 24 horas.
- Cada nueva consulta reserva cuota en SQL **antes** de consultar Idealista, también entre instancias.
- Si falta la función `reserve_idealista_request` o falla la comprobación, la búsqueda nueva se bloquea. No hay un contador en memoria que la sustituya.
- Los intentos fallidos también consumen reserva de forma conservadora.
- El panel solicita una confirmación explícita antes de buscar. Esa confirmación evita llamadas accidentales, pero no autentica al visitante.

El chat usa hasta tres rondas, cuatro herramientas y 1.600 tokens de salida por ronda. El límite de solicitudes es por proceso: 10 por minuto y 50 por hora. No es un presupuesto monetario distribuido. `LLM_ENABLED=false` pausa Anthropic; `MOCK_IDEALISTA=true` por sí solo no lo desactiva.

## Publicación de la aplicación web

La aplicación necesita un servidor Next.js; no basta con un alojamiento de archivos estáticos.

1. Comprueba el código con `npm run check`.
2. Importa el repositorio en Vercel, selecciona Next.js, Node.js 22 y la raíz del repositorio como directorio del proyecto.
3. Utiliza `npm ci` como instalación y `npm run build` como compilación.
4. Configura las variables de ese entorno. Empieza con proveedores de pago desactivados y habilita cada integración cuando esté preparada.
5. Establece `NEXT_PUBLIC_SITE_URL` al origen HTTPS del despliegue y publica.
6. Comprueba el panel, la calculadora, `/datos` y `/presentacion`; verifica historial, valoración y notificaciones solo si los has configurado.

También puede ejecutarse en un servidor Node con `npm run build` y `npm start`. En ese caso, programa por separado las tareas periódicas que necesites.

[`vercel.json`](../vercel.json) declara el cron de mercado a las 06:00 UTC y el tiempo máximo solicitado para las funciones indicadas. La ejecución y los límites efectivos dependen del entorno de alojamiento. La selección diaria usa otro planificador en Supabase: [Notificaciones](notificaciones.md).

Los entornos de prueba deben usar su propia base o dejar Supabase sin configurar. Si reutilizas la base de la demo, también compartirás sus conversaciones, favoritos y cuota. La integración GitHub/Vercel de una instalación existente puede publicar automáticamente al actualizar su rama de producción.
