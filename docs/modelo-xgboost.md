# Predictor XGBoost v3 · actualización del 16 de septiembre de 2026

El servicio Python vive en el repositorio académico `habitia-tfm`. La entrega recibida en `habitia_predictor` conserva los pesos de **410 árboles y 21 variables** y actualiza los índices distritales y el alquiler relativo del barrio a un escenario de 2026. El paquete se exportó el **16 de septiembre de 2026 a las 11:57:54**. El contrato HTTP es **3.3.0**, con identidad `habitIA-xgboost-2018-v3`. La versión del paquete de entrenamiento sigue siendo 3; no equivale a la versión de la API.

## Instalación

Con Python 3.12 o superior, desde `habitia-tfm`:

```bash
python -m pip install -r servicio/requirements_v3.txt
python scripts/install_predictor_v3.py habitia-modelo-v3.3.zip
python scripts/install_predictor_v3.py --check
python -m uvicorn servicio.api_v3:app --host 127.0.0.1 --port 8000 --workers 1
```

El ZIP está en `04_modelo/` de la entrega `HabitIA_TFM_2026-09-16` y en la [release del predictor](https://github.com/maupeon/habitia-tfm/releases/tag/tfm-2026-09-16-r2). El instalador comprueba los seis artefactos contra `servicio/manifiesto_v3.json`. Configura el mismo `VALORACION_TOKEN` privado en Python y Next.js, y `VALORACION_URL=http://127.0.0.1:8000` en la web. La URL es el origen, sin `/valorar`; en producción se mantiene `https://habitia-valoracion.fly.dev` y su token. Reinicia Next.js al cambiar variables.

## Cálculo y ámbito

El modelo estima **precio anunciado de 2018**, lo multiplica por el índice de venta del distrito **proyectado a 2026** y deriva una renta mensual con el ratio distrital **proyectado a 2026**. También se actualiza la variable de alquiler relativo del barrio: por eso puede cambiar la predicción base aunque los árboles sean idénticos. Las últimas fuentes observadas son **venta de 2025 y alquiler de 2024**; el escenario extrapola su tendencia desde 2018. No son mediciones completas de 2026 ni una validación de precisión actual. El ratio ya es mensual: no se divide otra vez entre doce. No se aplica el factor 1,5534 de LightGBM.

Se admiten pisos de Madrid capital de hasta 367 m² con superficie, habitaciones, baños, tipología, municipio y coordenadas observadas. Se conservan las nuevas abstenciones del paquete para descripciones de viviendas **a reformar u ocupadas/alquiladas**. La detección depende del texto; no verifica el estado jurídico ni físico de una vivienda. Esos anuncios permanecen en la búsqueda, sin estimación ni Fair. Los anuncios de obra nueva pueden recibir estimación, acompañada de una advertencia: varias viviendas de una promoción no son observaciones independientes.

La aplicación conserva descripción, garaje, operación y obra nueva al preparar cada anuncio. El servicio acepta hasta 24 anuncios y devuelve los errores por fila sin anular las viviendas válidas. El runtime carga el modelo una sola vez.

El paquete original admite venta. El adaptador mantiene la extensión de alquiler de HabitIA: usa las mismas características para estimar venta, deriva la mensualidad y compara importes en €/mes. No es un modelo de alquiler entrenado ni validado de forma independiente.

## Contrato web y scores

- `precio_estimado` siempre representa venta en euros. `operation`, `precio_comparacion` y `unidad_comparacion` identifican la comparación: venta total (`EUR`) o renta mensual (`EUR/mes`).
- `intervalo` y `banda` son null. El predictor no produce intervalos calibrados, SHAP ni etiquetas individuales de oportunidad.
- `calidad.obra_nueva` se añade a las advertencias de descripción ausente, planta imputada, ascensor inferido, barrio rescatado y valores fuera de rango.
- El cliente exige contrato 3.3.0, hashes del modelo y del paquete completo, año objetivo 2026, últimas fuentes 2025/2024, `ajuste_proyectado=true`, operación, unidades y coherencia aritmética. Envía `ano_ajuste=2026`; el backend utiliza también 2026 por defecto. `metodo_renta` identifica `ratio_distrital_proyectado_2026`. Fair y el score global no reutilizan valoraciones del artefacto sustituido.
- **Fair conserva su regla provisional** `limitar(50 − 2,5 × desviación %, 0, 100)`. Cambian los importes estimados al actualizar las tablas, no la escala ni las reglas de abstención. Esta actualización temporal no aporta una calibración de Fair.
- Sin estimación válida, Fair queda ausente, baja la cobertura del Fit Score y no se redistribuye su peso. Opportunity sigue usando evolución territorial de venta; es independiente del modelo individual.

Consulta [price-scores.md](price-scores.md), `lib/valoracion/client.ts`, `lib/valoracion/types.ts` y `lib/scoring/price-scores.ts`. Una referencia territorial no sustituye una valoración individual ausente.

## Metadatos, métricas y presentación

`app/presentacion/predictor-metadata.json` es una copia exacta de `habitia_predictor/data/models/paquete_produccion/metadatos.json`. Sus métricas históricas declaradas son:

| Métrica del test de 2018 | Valor |
| --- | ---: |
| Error porcentual mediano (MdAPE) | 9,2990 % |
| Error absoluto medio (MAE) | 49.220,20 € |
| Error absoluto mediano | 23.708,48 € |
| RMSE log | 0,185610 |
| R² log | 0,939894 |
| Casos con error dentro de ±20 % | 80,5552 % |
| RMSE log de validación cruzada declarado | 0,185772 |

No se ha repetido la evaluación. El paquete no incluye particiones, predicciones ni tamaño del test, ni el código completo de entrenamiento. El porcentaje dentro de ±20 % no es un intervalo individual. Las cifras no acreditan precisión actual ni validación independiente de alquiler.

La importancia de la presentación se recalcula desde el JSON nativo, como ganancia media de los nodos de división (`gain`): superficie, baños, alquiler mediano por m² del barrio, vulnerabilidad y ascensor. No es SHAP ni causalidad. La memoria distingue esta medida de la ganancia total (`total_gain`) de sus figuras; producen órdenes diferentes.

Para renovar ambas instantáneas de la presentación:

```bash
python3 scripts/sync-predictor-snapshot.py /ruta/al/paquete_produccion --service-evidence ../habitia-tfm/servicio
```

El script comprueba número de árboles y orden de variables antes de escribir; no entrena ni evalúa. Con `--service-evidence` verifica los seis hashes y la identidad del paquete en la evidencia y la paridad antes de publicar las copias en `public/model-results/`. Incluye sólo metadatos, importancia, manifiesto, resultados de casos sintéticos y comprobación de paridad; no publica pesos ni anuncios de usuarios. `scripts/sync-model-results.py` pertenece al antecedente LightGBM y no se usa para XGBoost. `results-data.json` y `results-legacy.json` conservan esos experimentos históricos, con procedencia distinta.

SHA-256 del modelo: `e5526aca6001741f24eb976dbd9607df131b3822b5b5a01b66c6c92af2a9d748`.
SHA-256 de los metadatos: `ff21768f6dd322b244b028b9ad0621f386e2b3dec817a0b2b68f4f25c38cb1ee`.

SHA-256 del paquete completo: `043304773c081968a67703429bbe028b3f397b1ccc49f2856fa0df91e7a079fc`. Se calcula sobre el JSON de los seis hashes, con claves ordenadas y separadores `,` y `:`. Esta identidad es necesaria porque el archivo de pesos no cambia respecto a 3.2.

Copias públicas: [metadatos](../public/model-results/predictor-metadata.json), [importancia](../public/model-results/predictor-importance.json), [manifiesto](../public/model-results/manifiesto_v3.json), [casos sintéticos](../public/model-results/evidencia_modelo_v3.json) y [paridad](../public/model-results/paridad_v3.json).

## Verificación y despliegue

`GET /salud` del servicio informa versión, hash y procedencia del modelo; `GET /api/valoracion` comprueba la conexión desde la web. `npm run check` verifica pruebas, tipos, lint y compilación. Desde `habitia-tfm`, `python -m unittest discover -s tests_v3 -v` comprueba contrato e inferencia con artefactos instalados y `httpx` como dependencia de pruebas.

La prueba de paridad compara el runtime con el paquete recibido en 152 casos: puntos interiores de los 131 polígonos de barrio y 21 casos límite. Las matrices y salidas nativas coinciden exactamente; la diferencia máxima al serializar el runtime es 5,82 × 10⁻¹¹ €. El informe `servicio/paridad_v3.json` registra 141 casos válidos y 11 abstenciones. Acredita conservación del cálculo, no precisión inmobiliaria. La entrega registra también las comprobaciones del despliegue.

La presentación muestra la proyección a 2026 ya incorporada y diferencia el año objetivo de las últimas fuentes observadas. Sus métricas siguen siendo las declaradas para 2018; las capturas y el vídeo de demostración anteriores conservan su carácter ilustrativo histórico.
