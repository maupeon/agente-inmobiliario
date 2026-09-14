# Predictor XGBoost v3

El servicio Python se distribuye en el repositorio académico `habitia-tfm`. La web incorpora el predictor recibido el 13 de septiembre de 2026 y conserva compatibilidad con LightGBM v2. El entrenamiento y los resultados de ambos modelos tienen procedencias distintas.

## Arranque

Con Python 3.12 o superior, desde `habitia-tfm`:

```bash
python -m pip install -r servicio/requirements_v3.txt
python scripts/install_predictor_v3.py habitia-modelo-v3.zip
python scripts/install_predictor_v3.py --check
python -m uvicorn servicio.api_v3:app --host 127.0.0.1 --port 8000 --workers 1
```

El ZIP está en `06_modelo/` de la entrega local. Los seis archivos se comprueban contra `servicio/manifiesto_v3.json`. El modelo se carga una sola vez. Configura el mismo `VALORACION_TOKEN` privado en Python y Next.js, y `VALORACION_URL=http://127.0.0.1:8000` en el servidor web. La URL es el origen, sin `/valorar`. Reinicia Next.js después de cambiar variables. En producción se conserva el origen HTTPS de Fly y su token.

## Contrato y presentación

- Identidad: `habitIA-xgboost-2018-v3`, versión `3.1.0`, objetivo `precio_anunciado`.
- Entrenamiento 2018; venta indexada por distrito a 2025. No se aplica de nuevo el factor 1,5534 de v2.
- 21 variables; pisos de compra o alquiler de Madrid capital de hasta 367 m². Se requieren superficie, habitaciones, baños, tipología, municipio y coordenadas observadas.
- La búsqueda y el chat conservan `description`, `parkingSpace.hasParkingSpace`, `operation` y los otros atributos. La ausencia de descripción o garaje se convierte en ausencia para el modelo y se advierte.
- Máximo 24 anuncios. La API valida cada fila antes de preparar geometrías y devuelve errores individuales sin anular los resultados válidos.
- `precio_estimado` y `brecha_pct` son estimaciones puntuales. `intervalo` y `banda` son null; el predictor no emite etiquetas de oportunidad ni SHAP. La aplicación calcula Fair con los importes comparables mediante una regla provisional, sin exigir bandas. Opportunity se calcula aparte con evolución territorial de venta; no usa el booleano `oportunidad` del predictor.
- Para probarlo: **Panel → Comprar o Alquilar → Piso → Madrid → Buscar → Ver detalles**. En alquiler se muestra y compara la mensualidad en €/mes.
- El contrato 3.1 añade `operation`, `precio_comparacion` y `unidad_comparacion`. `precio_estimado` conserva siempre el valor de venta; para `rent`, `precio_comparacion` es la renta mensual y `brecha_pct` compara mensualidades. La web rechaza operaciones o unidades incompatibles y conserva compatibilidad con venta v3.0.
- La renta mensual es un escenario derivado de ratios distritales de 2024, con `alquiler_validado=false`. No se traslada automáticamente a la calculadora.
- Las advertencias identifican datos ausentes, planta imputada, barrio rescatado y valores fuera de rango. El cliente comprueba fechas, identidad, coherencia aritmética y duplicados.

Tipos y validación: `lib/valoracion/types.ts` y `lib/valoracion/client.ts`. El panel y el chat comparten el adaptador. Una media territorial no sustituye una estimación ausente.

## Verificación y evaluación

`GET /salud` del servicio y `GET /api/valoracion` de la web permiten comprobar versión y conexión. `npm run check` verifica la web. Desde `habitia-tfm`, `python -m unittest discover -s tests_v3 -v` comprueba el runtime con los artefactos instalados y `httpx` como dependencia de pruebas.

Se verificó igualdad de precio con el paquete recibido en 131 anuncios sintéticos, uno por polígono de barrio, con diferencia máxima de 0 euros. Esto acredita conservación del cálculo, no precisión actual.

`app/presentacion/predictor-metadata.json` es una copia exacta de `habitia_predictor/DATOS/modelos/paquete_produccion/metadatos.json`, exportado el 13 de septiembre de 2026 a las 19:19:48. La presentación obtiene de esta copia las 21 variables, los 401 árboles, las fechas y las métricas de XGBoost: MdAPE 9,29 %, MAE 48.993 €, error absoluto mediano 23.649 €, RMSE log 0,1850, R² log 0,9403 y 80,28 % de casos dentro de ±20 % en el test de 2018. No se ha repetido la evaluación. El paquete no incluye particiones, tamaño del test ni notebook de selección.

El anexo del modelo distingue esa evaluación histórica del precio indexado a 2025 y de la renta derivada con ratios de 2024. La fracción de casos dentro de ±20 % no es un intervalo individual. Las métricas no acreditan precisión actual ni validación independiente de alquiler.

`app/presentacion/results-data.json` conserva el estudio agrupado LightGBM del 8 de septiembre como antecedente, junto con sus componentes visuales, pero ya no alimenta la diapositiva de pricing ni el anexo de Tomás. Sus 25 variables, MdAPE exterior 10,31 % e intervalos calibrados corresponden a otro experimento. Las cifras de ambos modelos no forman una comparación controlada.

Para actualizar esta instantánea, copiar los metadatos de una entrega verificada a `app/presentacion/predictor-metadata.json` y revisar también fórmulas, notas y alcance. No utilizar `scripts/sync-model-results.py` para XGBoost: ese importador pertenece al estudio LightGBM.

SHA-256 de los metadatos recibidos: `5da4831292ca56aad3d9054f9a64f4e1ce73bb87345b8e7056ec2f134c2f1e87`. El archivo nativo `modelo.json` confirma 21 entradas y 401 árboles. Esta comprobación identifica el artefacto; no valida su precisión.


## Presentación: revisión v7

Se muestra el mismo MAE de 48.993 € en pricing y anexo. La mediana absoluta de 23.649 € es otra estadística y se conserva en la metadata; no era un error de cálculo.

El top 5 mostrado se deriva del JSON nativo: media de `loss_changes` en nodos no hoja, agrupada por `split_indices`, sobre los 401 árboles. Corresponde a la importancia `gain` de XGBoost (no SHAP ni causalidad): superficie, baños, alquiler mediano €/m² del barrio, índice de vulnerabilidad y ascensor. Valores y hash del modelo en `app/presentacion/predictor-importance.json`. Definición: https://xgboost.readthedocs.io/en/stable/python/python_api.html#xgboost.Booster.get_score .

La fórmula de 2026 en la presentación es una **propuesta pendiente**, no una descripción del contrato desplegado: requiere una serie IPV homogénea en geografía/base y un ratio mensual renta/precio de 2026. El paquete sigue devolviendo venta a nivel de 2025 y renta con ratio de 2024. No se han modificado ni actualizado sus coeficientes.
