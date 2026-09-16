# Conectar el servicio de valoración

La integración vigente es [XGBoost v3, contrato 3.3.0](modelo-xgboost.md), actualizada con `habitia_predictor` el 16 de septiembre de 2026. El código Python, el instalador y las pruebas viven en el [repositorio académico](https://github.com/maupeon/habitia-tfm); los seis artefactos se distribuyen en su [release de entrega](https://github.com/maupeon/habitia-tfm/releases/tag/tfm-2026-09-16-r3).

[Volver al README](../README.md)

## Conexión de la web

Arranca el servicio según su README y configura en `.env.local`:

```dotenv
VALORACION_URL=http://127.0.0.1:8000
VALORACION_TOKEN=el-mismo-token-configurado-en-el-servicio
VALORACION_TIMEOUT_MS=10000
```

La URL es el origen, sin `/valorar`. En producción utiliza `https://habitia-valoracion.fly.dev` y su credencial privada. Reinicia Next.js después de cambiar variables.

```bash
curl http://127.0.0.1:8000/salud
curl http://localhost:3000/api/valoracion
```

`/api/valoracion` distingue servicio no configurado y servicio sin respuesta. Comprueba también la versión 3.3.0 y el hash vigente; un HTTP 200 por sí solo no garantiza compatibilidad. El cliente de `lib/valoracion/client.ts` valida cada respuesta y mantiene los errores individuales de las viviendas que quedan fuera del ámbito. No inventa una valoración a partir de medias territoriales.

## Antecedente LightGBM

LightGBM v2 (`habitIA-oferta-2018-v2`, contrato 2.0.0) y sus resultados permanecen documentados como estudio histórico. El cliente activo exige el artefacto XGBoost vigente: restaurar v2 en el servidor requiere una reversión coordinada del cliente; no es intercambiable en producción. Sus intervalos, bandas, 25 variables y factor temporal 1,5534 no pertenecen al nuevo modelo.

`app/presentacion/results-data.json` conserva el estudio agrupado del 8 de septiembre y `results-legacy.json` los antecedentes exploratorios. El importador de ese estudio sigue disponible:

```bash
python3 scripts/sync-model-results.py --source /ruta/al/experimento/resultados_revision.json
```

Requiere una fuente completa y válida y no modifica los artefactos del servidor. Su ubicación local histórica `../memoria/` se archivó; proporciona `--source` explícitamente. **No uses este importador para XGBoost**: sus instantáneas se actualizan con `scripts/sync-predictor-snapshot.py`, descrito en la guía vigente.

La evaluación retrospectiva, la indexación temporal y las atribuciones históricas de cada modelo tienen alcances distintos. No constituyen validación actual, oportunidades individuales de inversión ni efectos causales.
