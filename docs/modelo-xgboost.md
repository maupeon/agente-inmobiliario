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

- Identidad: `habitIA-xgboost-2018-v3`, versión `3.0.0`, objetivo `precio_anunciado`.
- Entrenamiento 2018; venta indexada por distrito a 2025. No se aplica de nuevo el factor 1,5534 de v2.
- 21 variables; pisos de venta de Madrid capital de hasta 367 m². Se requieren superficie, habitaciones, baños, tipología, municipio y coordenadas observadas.
- La búsqueda y el chat conservan `description`, `parkingSpace.hasParkingSpace`, `operation` y los otros atributos. La ausencia de descripción o garaje se convierte en ausencia para el modelo y se advierte.
- Máximo 24 anuncios. La API valida cada fila antes de preparar geometrías y devuelve errores individuales sin anular los resultados válidos.
- `precio_estimado` y `brecha_pct` son estimaciones puntuales. `intervalo` y `banda` son null; no hay oportunidades ni SHAP exportado. Fair no aporta puntos con v3 y sus pesos no se redistribuyen.
- La renta mensual es un escenario derivado de ratios distritales de 2024, con `alquiler_validado=false`. No se traslada automáticamente a la calculadora.
- Las advertencias identifican datos ausentes, planta imputada, barrio rescatado y valores fuera de rango. El cliente comprueba fechas, identidad, coherencia aritmética y duplicados.

Tipos y validación: `lib/valoracion/types.ts` y `lib/valoracion/client.ts`. El panel y el chat comparten el adaptador. Una media territorial no sustituye una estimación ausente.

## Verificación y evaluación

`GET /salud` del servicio y `GET /api/valoracion` de la web permiten comprobar versión y conexión. `npm run check` verifica la web. Desde `habitia-tfm`, `python -m unittest discover -s tests_v3 -v` comprueba el runtime con los artefactos instalados y `httpx` como dependencia de pruebas.

Se verificó igualdad de precio con el paquete recibido en 131 anuncios sintéticos, uno por polígono de barrio, con diferencia máxima de 0 euros. Esto acredita conservación del cálculo, no precisión actual.

`app/presentacion/results-data.json` conserva el estudio agrupado LightGBM del 8 de septiembre, con 25 variables, MdAPE exterior 10,31 % e intervalos calibrados. El XGBoost declara MdAPE 9,29 % en su test de 2018, pero no incluye particiones, tamaño del test ni notebook de selección. Las cifras no forman una comparación controlada. La memoria de entrega explica ambas procedencias.
