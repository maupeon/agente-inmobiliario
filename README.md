# HabitIA — búsqueda y estimación de oferta de vivienda

Prototipo de TFM: combina anuncios de Idealista, preferencias, un modelo de precio **anunciado de 2018** y una calculadora de escenarios de compra/alquiler. Panel y chat consultan el mismo backend Python. La indexación temporal es un escenario; no demuestra precisión en anuncios actuales ni identifica gangas con etiquetas independientes.

## Arranque local sin consumo de proveedores de pago

```bash
npm ci
cp -n .env.example .env.local
# En .env.local: MOCK_IDEALISTA=true, LLM_ENABLED=false, LLM_INSIGHTS_ENABLED=false
npm run dev
```

Abre `http://localhost:3000/dashboard`. Los anuncios sintéticos llevan etiqueta Demo, imágenes ilustrativas locales y no enlazan a anuncios inexistentes. `MOCK_IDEALISTA=true` desactiva el proveedor inmobiliario; **no basta por sí solo para desactivar Anthropic**. Para ello utiliza `LLM_ENABLED=false` y `LLM_INSIGHTS_ENABLED=false`.

El chat pagado requiere `ANTHROPIC_API_KEY` y `LLM_ENABLED=true`. El panel, favoritos y calculadora pueden revisarse sin esa clave. El historial y los favoritos permanecen en el perfil del navegador; no hay autenticación ni sincronización entre dispositivos.

## Variables

| Variable | Uso |
| --- | --- |
| `MOCK_IDEALISTA` | `true`: datos sintéticos. `false`: requiere claves y cuota SQL operativa. |
| `IDEALISTA_API_KEY` / `IDEALISTA_SECRET` | Credenciales del proveedor real; solo servidor. |
| `IDEALISTA_MONTHLY_LIMIT` | Máximo de intentos mensuales, hasta 100; se reserva antes del fetch. |
| `LLM_ENABLED` | `false` pausa el chat pagado. |
| `LLM_INSIGHTS_ENABLED` | Narración adicional opcional; desactivada salvo `true`. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Chat; modelo predeterminado `claude-opus-4-6`. |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Caché de mercado/búsquedas y cuota técnica; la clave de servicio nunca va al navegador. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No es necesaria para historial o favoritos de esta demo. |
| `VALORACION_URL` / `VALORACION_TOKEN` | Backend Python; por ejemplo `http://127.0.0.1:8018`. |
| `VALORACION_TIMEOUT_MS` | Espera del modelo, 10 s por defecto y máximo 20 s. |
| `ORS_API_KEY` | Rutas cuando está configurado; transporte público sigue aproximado. |

No subas `.env.local` al repositorio. Las copias de revisión se construyen sin este archivo y con claves vacías.

## Base de datos y cuota

Antes de activar búsquedas reales en una instalación existente, aplicar y verificar:

`supabase/migrations/20260908_demo_privacy_quota.sql`

La migración activa RLS, retira acceso público a tablas privadas, crea caché de búsquedas y la función `reserve_idealista_request`. La reserva usa un bloqueo transaccional: comprueba consumo y registra el intento antes de llamar a Idealista, también entre instancias. Los intentos fallidos consumen reserva de forma conservadora.

**Sin esa función o con un fallo de verificación, las búsquedas nuevas se bloquean.** No se sustituye por un contador en memoria. Los mocks y resultados cacheados siguen funcionando. `supabase/schema.sql` incluye la configuración para una instalación nueva. Estos archivos locales no prueban que la migración ya esté aplicada en el entorno remoto.

Las rutas `/api/conversations` y `/api/favorites` están cerradas (410). Los datos antiguos de Supabase no se eliminan automáticamente; revisar su protección y conservación antes del despliegue.

## Evidencia y fuentes

- El modelo usa un único transformador de 25 variables para entrenamiento y servicio, datos ausentes explícitos y abstención fuera de soporte.
- La evaluación corregida es **retrospectiva agrupada**: los datos de 2018 ya se habían explorado. No se llama test virgen a una nueva división del mismo histórico.
- El backend devuelve versión, periodo, estado, intervalos y explicación SHAP opcional. Las atribuciones no son efectos causales.
- Si el modelo no responde, se muestra el estado. Una referencia provincial, cuando está verificada, se presenta como tal, sin bandas ni colores de valoración individual.
- El cliente exige el contrato revisado v2 y su identificador de modelo; rechaza servicios heredados aunque respondan HTTP 200, metadatos incompatibles y predicciones fuera de su intervalo.
- Los fixtures de alquiler, tipos y precios son ilustrativos sin validación documental; no se usan para clasificar precios como observaciones oficiales.
- Los indicadores manuales de seguridad/calidad de vida están retirados del ranking. Los requisitos incumplidos explícitamente se filtran y los desconocidos se señalan.
- `/datos` muestra procedencia y periodos disponibles. Una fecha de caché no se presenta como fecha de observación.

## Actualizar la presentación al terminar el experimento

```bash
python3 scripts/sync-model-results.py
```

Lee exclusivamente `../memoria/revision_2026-09-08/experimento/resultados_revision.json`. Si falta o está incompleto, no modifica la presentación. Verifica número de grupos, métricas finitas y paridad del artefacto; exporta cifras, SHAP y hash de la fuente a `app/presentacion/results-data.json`.

Mientras los resultados no estén sincronizados, las vistas revisadas dicen «Pendiente». Las cifras antiguas permanecen en `results-legacy.json` y solo se muestran como antecedentes exploratorios, identificadas como no independientes. La arquitectura visual, los controles y las animaciones se conservan.

## Verificación y límites de consumo

```bash
node docs/auditoria_2026-09-08/app_regression.cjs
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

Las comprobaciones de regresión bloquean la red y no usan credenciales. Incluyen privacidad, contrato, abstención, cuota antes de red, caché, requisitos y 324 escenarios de la calculadora.

El chat tiene hasta 3 rondas, 4 herramientas y 1.600 tokens de salida por ronda. El rate limit de solicitudes es **por proceso** (10/min y 50/h); se reinicia y no es un presupuesto monetario distribuido. `LLM_ENABLED=false` permite pausar el consumo. No se garantiza una factura total fija por estos límites.

## Organización

- `app/api/`: chat SSE, recomendaciones, enriquecimiento y proxy de valoración.
- `lib/agent/`: prompt y herramientas, incluida `valorar_vivienda`.
- `lib/valoracion/`: contrato común con el backend de `../memoria/servicio/`.
- `lib/local-conversations.ts`, `hooks/useFavorites.ts`: persistencia local.
- `lib/idealista/`: proveedor, mocks, caché y cuota.
- `lib/market/`: fuentes, procedencia y respaldos explícitos.
- `lib/finance/rent-vs-buy.ts`: simulación, ganador al horizonte final y exención fiscal como supuesto separado.
- `docs/auditoria_2026-09-08/cambios_app.md`: cambios y límites de verificación.

No se ha activado ningún pago, ejecutado una migración remota ni desplegado esta revisión automáticamente. El despliegue debe coordinar app, backend y artefactos comprobados.
