# Predictor XGBoost v3 · actualización del 16 de septiembre de 2026

El servicio Python vive en el repositorio académico `habitia-tfm`. La entrega recibida en `nuevo_modelo` sustituye los pesos anteriores: **410 árboles y 21 variables**, paquete exportado el **15 de septiembre de 2026 a las 22:56:50**. El contrato HTTP es **3.2.0**, con identidad `habitIA-xgboost-2018-v3`. La versión del paquete de entrenamiento sigue siendo 3; no equivale a la versión de la API.

## Instalación

Con Python 3.12 o superior, desde `habitia-tfm`:

```bash
python -m pip install -r servicio/requirements_v3.txt
python scripts/install_predictor_v3.py habitia-modelo-v3.zip
python scripts/install_predictor_v3.py --check
python -m uvicorn servicio.api_v3:app --host 127.0.0.1 --port 8000 --workers 1
```

El ZIP está en `04_modelo/` de la entrega `HabitIA_TFM_2026-09-16` y en la [release del predictor](https://github.com/maupeon/habitia-tfm/releases/tag/tfm-2026-09-16). El instalador comprueba los seis artefactos contra `servicio/manifiesto_v3.json`. Configura el mismo `VALORACION_TOKEN` privado en Python y Next.js, y `VALORACION_URL=http://127.0.0.1:8000` en la web. La URL es el origen, sin `/valorar`; en producción se mantiene `https://habitia-valoracion.fly.dev` y su token. Reinicia Next.js al cambiar variables.

## Cálculo y ámbito

El modelo estima **precio anunciado de 2018**, lo multiplica por el índice registral de venta del distrito hasta **2025** y deriva una renta mensual con el ratio distrital de **2024**. El ratio ya es mensual: no se divide otra vez entre doce. No se aplica el factor 1,5534 de LightGBM. Esta entrega no incluye índices nuevos de 2026 ni acredita precisión actual.

Se admiten pisos de Madrid capital de hasta 367 m² con superficie, habitaciones, baños, tipología, municipio y coordenadas observadas. Se conservan las nuevas abstenciones del paquete para descripciones de viviendas **a reformar u ocupadas/alquiladas**. La detección depende del texto; no verifica el estado jurídico ni físico de una vivienda. Esos anuncios permanecen en la búsqueda, sin estimación ni Fair. Los anuncios de obra nueva pueden recibir estimación, acompañada de una advertencia: varias viviendas de una promoción no son observaciones independientes.

La aplicación conserva descripción, garaje, operación y obra nueva al preparar cada anuncio. El servicio acepta hasta 24 anuncios y devuelve los errores por fila sin anular las viviendas válidas. El runtime carga el modelo una sola vez.

El paquete original admite venta. El adaptador mantiene la extensión de alquiler de HabitIA: usa las mismas características para estimar venta, deriva la mensualidad y compara importes en €/mes. No es un modelo de alquiler entrenado ni validado de forma independiente.

## Contrato web y scores

- `precio_estimado` siempre representa venta en euros. `operation`, `precio_comparacion` y `unidad_comparacion` identifican la comparación: venta total (`EUR`) o renta mensual (`EUR/mes`).
- `intervalo` y `banda` son null. El predictor no produce intervalos calibrados, SHAP ni etiquetas individuales de oportunidad.
- `calidad.obra_nueva` se añade a las advertencias de descripción ausente, planta imputada, ascensor inferido, barrio rescatado y valores fuera de rango.
- El cliente verifica versión, hash, identidad, operación, unidades, periodos y coherencia aritmética. Fair y el score global no reutilizan valoraciones del artefacto sustituido.
- **Fair conserva su regla provisional** `limitar(50 − 2,5 × desviación %, 0, 100)`. Cambian los importes estimados y las abstenciones, no la escala. Una nueva entrega de pesos no aporta por sí sola una calibración de Fair.
- Sin estimación válida, Fair queda ausente, baja la cobertura del Fit Score y no se redistribuye su peso. Opportunity sigue usando evolución territorial de venta; es independiente del modelo individual.

Consulta [price-scores.md](price-scores.md), `lib/valoracion/client.ts`, `lib/valoracion/types.ts` y `lib/scoring/price-scores.ts`. Una referencia territorial no sustituye una valoración individual ausente.

## Metadatos, métricas y presentación

`app/presentacion/predictor-metadata.json` es una copia exacta de `nuevo_modelo/data/models/paquete_produccion/metadatos.json`. Sus métricas históricas declaradas son:

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
python3 scripts/sync-predictor-snapshot.py /ruta/al/paquete_produccion
```

El script comprueba número de árboles y orden de variables antes de escribir; no entrena ni evalúa. `scripts/sync-model-results.py` pertenece al antecedente LightGBM y no se usa para XGBoost. `results-data.json` y `results-legacy.json` conservan esos experimentos históricos, con procedencia distinta.

SHA-256 del modelo: `e5526aca6001741f24eb976dbd9607df131b3822b5b5a01b66c6c92af2a9d748`.
SHA-256 de los metadatos: `64befffab61e4e9195e10108ce2da14df92698ed50ba762f753b438baaf42032`.

## Verificación y despliegue

`GET /salud` del servicio informa versión, hash y procedencia del modelo; `GET /api/valoracion` comprueba la conexión desde la web. `npm run check` verifica pruebas, tipos, lint y compilación. Desde `habitia-tfm`, `python -m unittest discover -s tests_v3 -v` comprueba contrato e inferencia con artefactos instalados y `httpx` como dependencia de pruebas.

La prueba de paridad compara el runtime con el paquete recibido en 152 casos: puntos interiores de los 131 polígonos de barrio y 21 casos límite. Las matrices y salidas nativas coinciden exactamente; la diferencia máxima al serializar el runtime es 5,82 × 10⁻¹¹ €. El informe `servicio/paridad_v3.json` registra 141 casos válidos y 11 abstenciones. Acredita conservación del cálculo, no precisión inmobiliaria. La entrega registra también las comprobaciones del despliegue.

La presentación mantiene identificada como pendiente la propuesta de índices de 2026. Sus notas y métricas reflejan el artefacto nuevo; las capturas y el vídeo de demostración anteriores conservan su carácter ilustrativo histórico.
