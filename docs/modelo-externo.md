# Conectar el servicio de valoración

[Volver al README](../README.md)

El modelo Python **no forma parte de este repositorio**. La aplicación contiene su cliente HTTP y los resultados agregados utilizados por la presentación. El código de entrenamiento, los artefactos LightGBM y el servicio FastAPI se entregan por separado con la memoria del TFM.

## Qué necesitas

Una instalación operativa del servicio v2 y sus artefactos compatibles. Sus instrucciones están en [habitia-tfm/servicio/README.md](https://github.com/maupeon/habitia-tfm/blob/main/servicio/README.md); el contrato HTTP se implementa en `servicio/api.py` de ese repositorio académico. El ZIP del modelo se obtiene de su release privada. Sigue allí la instalación de Python y del modelo. Clonar únicamente esta aplicación no instala ese servicio.

Una vez arrancado, configura en `.env.local`:

```dotenv
VALORACION_URL=http://127.0.0.1:8000
VALORACION_TOKEN=el-mismo-token-configurado-en-el-servicio
VALORACION_TIMEOUT_MS=10000
```

Usa el puerto real de tu instalación. La URL es el origen del servicio, sin `/valorar` al final. En producción, utiliza su origen HTTPS y una credencial privada. Reinicia Next.js después del cambio.

## Comprobar la conexión

```bash
# Servicio Python arrancado en el puerto de este ejemplo:
curl http://127.0.0.1:8000/salud

# Aplicación web arrancada:
curl http://localhost:3000/api/valoracion
```

`/api/valoracion` distingue entre servicio no configurado y servicio sin respuesta. La respuesta de `/salud` permite comprobar disponibilidad y versión. Una respuesta HTTP 200 por sí sola no garantiza que una valoración sea compatible.

## Contrato que exige la aplicación

El contrato completo está en [`lib/valoracion/types.ts`](../lib/valoracion/types.ts) y sus validaciones en [`lib/valoracion/client.ts`](../lib/valoracion/client.ts).

- Versión `2.0.0` e identificador `habitIA-oferta-2018-v2`.
- Objetivo `precio_anunciado`, entrenamiento de 2018 y precisión actual no validada.
- Resultados por anuncio con estado, nivel temporal, factor de escenario, advertencias y, cuando procede, precio e intervalo válidos.
- Soporte limitado a viviendas compatibles de venta en Madrid, con comprobaciones de municipio, tipología y coordenadas. Los atributos ausentes no se inventan.
- El punto estimado debe quedar dentro del intervalo. Se rechazan versiones heredadas, metadatos incompatibles, duplicados y resultados no solicitados.

El cliente web solicita el escenario indexado mediante `/valorar`. El factor heredado `1,5534` para Q1 2026 pertenece al artefacto. Descargar un nuevo histórico del IPV en `/datos` no cambia ese factor ni reentrena el modelo.

Si faltan datos, el anuncio queda fuera del ámbito o el servicio no está disponible, se conserva el estado y se explica la ausencia de valoración. Una referencia provincial verificada aporta contexto; no genera una banda individual Barato/Justo/Caro. La valoración de alquiler sigue sin una referencia validada integrada.

## Resultados de la presentación

[`app/presentacion/results-data.json`](../app/presentacion/results-data.json) conserva un resumen del experimento revisado, su identificador, fecha y SHA-256 de la fuente. [`results-legacy.json`](../app/presentacion/results-legacy.json) se utiliza únicamente para identificar antecedentes exploratorios en los visuales que los comparan.

Para importar un experimento completo recibido con la memoria:

```bash
python3 scripts/sync-model-results.py --source /ruta/al/experimento/resultados_revision.json
```

El script requiere solo la biblioteca estándar de Python. Sin `--source`, busca la estructura local de la entrega: `../memoria/revision_2026-09-08/experimento/resultados_revision.json`. Si no encuentra una fuente completa y válida, termina sin modificar la presentación. No entrena ni modifica los artefactos del servidor.

La evaluación es retrospectiva y agrupada sobre un histórico ya explorado. La indexación no demuestra precisión actual, las bandas no acreditan oportunidades de inversión y las atribuciones SHAP no son efectos causales.
