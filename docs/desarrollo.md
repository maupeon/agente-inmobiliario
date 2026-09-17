# Desarrollo, pruebas y mantenimiento

[Volver al README](../README.md)

## Entorno reproducible

Usa Node.js 22, npm y `npm ci`. [`.nvmrc`](../.nvmrc) fija la familia de Node y [`package-lock.json`](../package-lock.json) fija el árbol de dependencias. [`.npmrc`](../.npmrc) mantiene la resolución de dependencias pares igual en local y en CI, aunque exista una configuración global diferente. No generes archivos de bloqueo de otros gestores. Python se necesita únicamente para actualizar las instantáneas o importar resultados del modelo externo.

## Verificación de la aplicación

```bash
npm run check
```

El comando ejecuta todas las suites de `tests/`, TypeScript, ESLint y la compilación de Next.js. Las pruebas cargan la lógica con proveedores simulados y no necesitan `.env.local`, Anthropic, Idealista ni una base de datos. GitHub Actions ejecuta el mismo comando sobre una instalación limpia.

| Suite | Cobertura principal |
| --- | --- |
| `tests/app-regression.test.cjs` | Validación de API, demo compartida, abstenciones, respuestas del modelo, cuota y caché |
| `tests/scoring-search.test.cjs` | Pesos, evidencias ausentes, filtros, orden y recuperación de la última búsqueda |
| `tests/market-data.test.cjs` | Formatos de INE/BdE, series correctas, periodos y respuestas inválidas |
| `tests/notifications-api.test.cjs` | Identidad, autorización, origen, selección de cinco únicos y errores |
| `tests/commute.test.cjs` | Geometría, modos, estimaciones y trayectos de cero minutos |
| `tests/madrid-scope.test.cjs` | Límite municipal, perfiles y anuncios fuera de Madrid |
| `tests/web-validation.test.cjs` | Datos persistidos, URL seguras, historial largo, filtros y entradas HTTP |
| `tests/valoracion-v3.test.cjs` | API XGBoost, identidad, venta, alquiler y abstenciones |
| `tests/rent-vs-buy.test.cjs` | Patrimonio, gastos, impuestos, hipoteca e invariantes en 324 escenarios |

Para ejecutar una sola suite:

```bash
node --test tests/scoring-search.test.cjs
```

Las comprobaciones de compatibilidad con la API usan respuestas simuladas: no acreditan que un servicio remoto o un cron esté desplegado. El SQL se comprueba por separado.

## Pruebas SQL

[`supabase/tests/notifications.sql`](../supabase/tests/notifications.sql) comprueba permisos, horarios, reservas, duplicados y reintentos dentro de una transacción que termina con rollback. Necesita una base Supabase/PostgreSQL **local y desechable**, con los roles de Supabase y las migraciones de notificaciones aplicadas.

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/notifications.sql
```

`TEST_DATABASE_URL` debe apuntar expresamente a esa base de pruebas. No forma parte de las variables del servidor web ni de `npm run check`.

## Comprobación manual

Después de compilar, ejecuta `npm start`. Con la configuración de ejemplo:

1. Abre el panel, guarda un perfil de ejemplo y confirma una búsqueda en Madrid.
2. Comprueba tarjetas, mapa, detalle y desglose de los cuatro componentes del score.
3. Cambia los supuestos de la calculadora y comprueba que se actualizan patrimonio y gráficos.
4. Revisa `/datos`, `/como-funciona` y todas las escenas de `/presentacion`, incluido el vídeo.
5. Confirma que chat, historial, favoritos y notificaciones explican la falta de configuración cuando no se han conectado sus servicios.

Para revisar las integraciones, utiliza un entorno propio y habilítalas con la [guía de configuración](configuracion.md).

## Scripts de mantenimiento

Ejecuta todos los comandos desde la raíz del repositorio.

| Script | Función | Requisito |
| --- | --- | --- |
| `scripts/import-neighborhood-context.py` | Regenerar el contexto de distrito desde las fuentes incluidas | Python y `openpyxl` |
| `scripts/import-urban-sources.py` | Importar las instantáneas de censo y Metro | Python; descarga si falta la caché |
| `scripts/sync-predictor-snapshot.py` | Sincronizar metadatos XGBoost, importancia y evidencia | Python y seis artefactos verificados |
| `scripts/sync-model-results.py` | Exportar el antecedente LightGBM | Python y resultados históricos externos completos |
| `scripts/import-zone-indicators.py` | Reproducir los cuatro indicadores de Zone | Censo original con la huella documentada |
| `scripts/setup-notifications.mjs` | Comprobar o configurar el planificador | Acceso administrativo a Supabase |

Los importadores y el instalador no se ejecutan durante `npm ci`, las pruebas ni la compilación. Sus instrucciones están en [Datos](datos.md), [Modelo externo](modelo-externo.md) y [Notificaciones](notificaciones.md).

## Problemas habituales

| Síntoma | Comprobación |
| --- | --- |
| Falla `npm ci` | Comprueba Node/npm y que `package.json` corresponda al lockfile. Tras cambiar dependencias intencionadamente, actualiza y versiona ambos |
| El chat está pausado | Configura `ANTHROPIC_API_KEY` y `LLM_ENABLED=true`; reinicia el servidor |
| No se guardan favoritos o historial | Comprueba URL, clave de servidor y tablas `demo_*`; no basta con añadir la URL |
| La búsqueda real se bloquea | Comprueba cuota, función SQL de reserva y credenciales de Idealista |
| No hay valoración | Comprueba `/api/valoracion`, conectividad, API 3.3.0 y hash del artefacto vigente; revisa también abstenciones por anuncio |
| No aparece un dato oficial | La fuente puede estar caída o carecer de una referencia verificada; la interfaz muestra procedencia y respaldo |
| No llega una selección diaria | Comprueba suscripción, hora/zona, migraciones, Vault y planificador |
| Cambiar `.env.local` no surte efecto | Reinicia Next.js; las variables públicas también requieren recompilar en producción |

## Qué se versiona

El repositorio conserva código activo, configuración reproducible, migraciones, pruebas, guías y recursos que usa la aplicación. Los datos oficiales pequeños mantienen su procedencia; la presentación conserva sus métricas y su vídeo.

Las notas de revisión, exportaciones, capturas de pruebas, cachés, archivos de asistentes y credenciales quedan fuera mediante [`.gitignore`](../.gitignore). El historial de Git conserva versiones anteriores de los archivos retirados; una limpieza del árbol actual no reescribe ese historial.

## Dependencias de seguridad

Next.js 15.5.25, React 19.3, MapLibre 6.10 y SheetJS 0.20.3 se verifican juntos. SheetJS se obtiene de su [distribución oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/); el registro npm mantiene una edición antigua. El override de PostCSS obliga a Next.js a compartir la rama 8.5.28 o posterior, en lugar de su dependencia 8.4.31 vulnerable. El lockfile fija los bytes mediante integridad. Ejecuta `npm audit` después de actualizar y `npm ci` para comprobar una instalación limpia.
