# Trabajar en HabitIA

1. Sigue el arranque del [README](README.md) y utiliza Node.js 22 y npm.
2. Crea una rama descriptiva a partir de `main`.
3. Sitúa la interfaz en `components/<función>/`, la lógica en `lib/` y las rutas en `app/`. Mantén junto a cada componente su CSS específico.
4. Actualiza la documentación si cambias configuración, contratos, fuentes o comportamiento visible.
5. Ejecuta `npm run check` y abre una pull request con el cambio y su verificación.

Usa el alias `@/` para importaciones entre áreas. Conserva los tipos compartidos en `types/` y las pruebas en `tests/*.test.cjs`. Las pruebas de proveedores deben usar simulaciones; no añadas llamadas reales a la suite ni a CI.

Los datos de ejemplo deben identificarse como tales. Conserva la fuente, el periodo y las huellas disponibles de las instantáneas oficiales. No cambies manualmente las métricas del TFM: se generan mediante `scripts/sync-model-results.py`.

Nunca incluyas `.env.local`, claves, conversaciones reales, exportaciones de Supabase, datos originales de entrenamiento, cachés o entregables personales. `.env.example` contiene solo valores de ejemplo y credenciales vacías. Revisa `git diff --cached` antes de publicar.

No elimines migraciones históricas para simplificar el árbol: las instalaciones existentes pueden necesitarlas. Si cambia el esquema, añade una migración y explica el orden de aplicación en [Configuración](docs/configuracion.md).
