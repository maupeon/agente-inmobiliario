# Auditoría de HabitIA y plan para la defensa del TFM

Fecha de revisión: 8 de septiembre de 2026.

HabitIA tiene una base suficiente para construir un TFM muy sólido: datos reales, varias familias de modelos, una referencia sencilla, análisis de localización, incertidumbre y una aplicación. El trabajo pendiente más valioso consiste en corregir la evaluación, hacer coincidir el servicio con lo evaluado y ajustar las afirmaciones de la memoria. Añadir funcionalidades ahora tendría menos impacto que cerrar esas tres brechas.

La incidencia inmediata es operativa: **la prueba de Fly.io ya terminó y la aplicación pública no recibe respuesta del servicio del modelo**. La web puede seguir funcionando con una heurística. Eso hace necesario comprobar la procedencia de cada valoración, además de que la página cargue.

Este informe es una auditoría con comprobaciones reproducibles y una propuesta; no modifica los modelos, la aplicación ni los servicios de producción. No se ha activado facturación ni contratado infraestructura.

## Alcance y límites de la revisión

Se revisaron las capas de la aplicación Next.js, rutas API, agente, persistencia, fuentes, recomendador, calculadora, integración del modelo y configuración de despliegue; la carpeta hermana `memoria`, datos Parquet, scripts de entrenamiento y servicio, artefactos y resultados; la memoria, anexos, presentación y guiones; y la guía académica proporcionada.

Se ejecutaron lint, comprobación TypeScript, una compilación limpia aislada, comprobaciones locales de comportamiento de la app, la batería existente del valorador y predicciones sobre los 23.416 registros de prueba. Se inspeccionaron la portada y el índice renderizados, además del texto de los documentos. La navegación pública comprobó inicio y datos; se consultaron el estado público del modelo y Fly en modo lectura. Se verificaron tarifas y documentación en fuentes oficiales.

**No equivale a certificar el proyecto al 100 %.** No se reentrenaron todos los modelos ni se repitió la búsqueda completa de hiperparámetros. No se verificó una muestra nueva de viviendas de 2026, ni un flujo completo público con llamadas cobrables a Idealista/Claude. No se realizó una auditoría visual exhaustiva en todos los dispositivos. No se pudieron inspeccionar las políticas y facturas reales de todas las cuentas cloud. Los vídeos se trataron como material de defensa, no como código del producto. Las conclusiones distinguen resultados recalculados, resultados almacenados y observaciones de producción.

## Qué está demostrado

El problema implementado es una **regresión del precio de oferta**. A partir de la predicción y de un intervalo, se deriva una señal de precio bajo o alto. No hay un clasificador supervisado entrenado con etiquetas externas de «ganga verdadera».

| Evaluación | Error porcentual absoluto mediano | Qué representa |
|---|---:|---|
| Mediana de €/m² del barrio × superficie | 15,40 % | Referencia almacenada del experimento histórico |
| LightGBM de laboratorio, 54 variables | **8,20 %** | Recalculado sobre 23.416 filas; coincide exactamente con las predicciones guardadas |
| Modelo de 35 variables con entradas simuladas para el servicio | **8,79 %** | Reproducido; es la evaluación de la preparación de datos del entrenamiento |
| Ejecución de `Valorador` con anuncios históricos reconstruidos | **9,08 %** | Recalculado pasando todas las filas por la transformación real de Python; no es una medición de anuncios actuales |
| Simulación de la pérdida de tipología en el adaptador web | **9,14 %** | Mismas filas sin `detailedType`; simulación histórica, no prueba completa de la web publicada |
| Q1–Q3 de 2018 → Q4 de 2018, modelo de laboratorio | 9,72 % | Resultado almacenado; no se reentrenó en esta auditoría |
| Barrios completos excluidos, modelo de laboratorio | 19,86 % | Resultado almacenado; no se reentrenó en esta auditoría |

MdAPE 8,20 % significa que la mitad de los errores porcentuales absolutos está por debajo de ese valor; **no significa una exactitud del 91,8 %**. La mejora histórica del modelo de laboratorio frente a la referencia es aproximadamente 47 % en esa métrica. Las cifras todavía están sujetas al problema de selección sobre test descrito abajo.

En la ejecución del valorador sobre 23.416 anuncios reconstruidos:

- MAPE: 13,30 %; mediana del error absoluto: 24.098 euros de 2018.
- 53,67 % de las estimaciones quedan dentro de ±10 % del precio anunciado.
- Cobertura de los intervalos: 89,96 %; anchura mediana: 58,48 % del precio anunciado.
- En el decil más barato la cobertura baja al 80,10 % y el sesgo mediano es +11,73 %.
- 57 estimaciones puntuales quedan fuera de su intervalo. Esto puede ocurrir al ajustar modelos separados, pero contradice la expectativa del contrato y de la prueba que comprueba un único ejemplo.
- La sección censal coincide con la del dataset en el 74,40 % de los casos; el barrio, en el 95,57 %.
- Cambiar únicamente el precio anunciado no cambia el precio estimado: una comprobación favorable de independencia del objetivo en inferencia.

El payload reconstruido conserva atributos de tipología que el adaptador web pierde. Al eliminarlos, el error mediano sube a 9,14 % y la cobertura es 89,87 %. Este experimento usa `propertyType=homes`, porque el Parquet no conserva el tipo bruto de la API. Ninguna de las dos cifras debe publicarse como evaluación completa de la web desplegada ni del mercado de 2026.

Evidencias: `memoria/auditoria_2026-09-08/metricas_verificadas.json`, `verificar_modelo.py` y `verificar_modelo.log`. Las rutas se refieren a la carpeta TFM, un nivel por encima de este repositorio.

## Prioridades que pueden cambiar la calidad del TFM

### P0 — Recuperar el modelo y hacer visible su estado

`flyctl status --app habitia-valoracion --json` devolvió que la prueba había terminado y exigía añadir tarjeta. La consulta a [estado público de HabitIA](https://habitiaucm.vercel.app/api/valoracion) respondió HTTP 200 con `configurado: true` y `servicio: "sin respuesta"`.

`lib/valoracion/client.ts` convierte errores y timeouts en un mapa vacío; `lib/enrich.ts` utiliza entonces la referencia provincial. La disponibilidad de la home no acredita la disponibilidad del modelo. Además, `desdeModelo` reutiliza etiquetas que hablan de media provincial aun cuando la referencia procede del modelo.

**Acción:** recuperar el backend, mostrar claramente «modelo disponible», «referencia aproximada» o «sin valoración», y registrar versión, periodo y origen. La prueba de aceptación debe comprobar que un inmueble de compra en Madrid devuelve `nivel: modelo`, un intervalo y la misma versión del artefacto evaluado. Simular también el backend caído y comprobar el aviso.

### P0 — Corregir el uso del conjunto de prueba

En `memoria/src/02_modelos.py:137`, XGBoost recibe `(Xte, yte)` para decidir el early stopping. En `memoria/src/02b_seleccion.py:86`, la configuración final se elige con el menor MdAPE medido sobre ese test. En consecuencia, ese conjunto participa en decisiones del modelo y deja de ser una evaluación final completamente independiente.

La codificación territorial usa KFold por filas: se encontraron 3.901 ASSETID compartidos entre las dos partes del primer fold examinado. El modelo final prescinde de esas codificaciones, lo que limita el impacto sobre él, pero afecta a la limpieza de las comparativas y a las afirmaciones metodológicas. Las transformaciones aprendidas deben ajustarse dentro de cada fold.

También hay que aislar la selección de hiperparámetros de la evaluación temporal: el ajuste final Q1–Q3 excluye Q4, pero reutiliza parámetros seleccionados previamente con datos que incluían Q4. Los cortes de precio y algunas imputaciones se calculan antes de dividir; y el stacking usa predicciones del propio entrenamiento. Son razones adicionales para rehacer una comparativa compacta con un protocolo coherente, sin asumir que todos los resultados guardados son evaluaciones independientes.

**Acción:** congelar el protocolo; seleccionar variables e hiperparámetros mediante validación interna agrupada por inmueble, dejando la calibración separada. Evaluar al final con datos independientes o con un protocolo externo anidado que separe la selección de la evaluación. Cambiar solamente la semilla después de haber utilizado todo el dataset no convierte automáticamente una partición en prueba virgen. Si se mantiene el experimento actual por plazo, llamarlo evaluación exploratoria y declarar el sesgo de selección.

Mantener una referencia sencilla y LightGBM. No hace falta introducir más familias de algoritmos. La distinción entre entrenamiento, validación y test sigue las [recomendaciones de scikit-learn](https://scikit-learn.org/stable/common_pitfalls.html).

### P0 — Usar una sola preparación de variables en entrenamiento y servicio

La simulación de `10_servicio.py` y `src/valorador.py` no reconstruyen exactamente las mismas entradas: cambian medianas frente a cálculos de distancias y proporciones, y la sección más cercana se busca en grados en un recorrido y en kilómetros en otro. Esto cambia la sección asignada en 1.664 de los 23.416 casos y explica parte de la diferencia entre 8,79 % y 9,08 %. El JSON de auditoría detalla las columnas afectadas.

El adaptador `lib/valoracion/client.ts` también debe preservar la información disponible de tipología. El servicio acepta ejemplos fuera de Madrid y valores fuera de dominio, entre ellos precios negativos y superficies de 1 o 2.000 m²; llega a emitir señales de oportunidad. La expresión `/madrid/i` del cliente no sustituye un control geográfico en el backend.

**Acción:** extraer una función compartida que transforme el anuncio en las 35 variables, usarla para entrenar y para servir, y recalibrar los intervalos sobre ese mismo recorrido. Añadir validación de municipio, tipo de inmueble, números finitos, rangos y campos ausentes. Para ubicaciones o entradas fuera de alcance, abstenerse de valorar. Una tabla de pruebas debe cubrir pisos, estudios, dúplex, última planta, viviendas sin ascensor, datos ausentes y límites geográficos.

### P0 — Ajustar las conclusiones de incertidumbre y oportunidad

La cobertura agregada cercana al 90 % es una fortaleza; no demuestra una probabilidad del 90 % para cada vivienda ni para el mercado actual. La [regresión cuantílica conformalizada](https://arxiv.org/abs/1905.03222) ofrece cobertura marginal bajo intercambiabilidad. El cambio temporal, la dependencia entre anuncios y la selección de casos exigen matizar su aplicación. El texto de la ficha «9 de cada 10 viviendas así caen aquí» y la conclusión de cobertura estable en todos los deciles exceden lo demostrado.

La comparación económica tampoco constituye validación independiente de gangas: se selecciona usando precio anunciado bajo respecto al modelo, y se evalúa rentabilidad como alquiler de referencia dividido por ese mismo precio. Un denominador pequeño eleva mecánicamente la rentabilidad. Estratificar por distrito y obtener un p-valor pequeño no elimina esa dependencia.

**Acción:** hablar de «precio anunciado por debajo de lo esperable» y «caso para revisar», sustituir «ahorro conseguido» por «brecha respecto a la estimación» y describir el análisis de rentabilidad como contraste descriptivo. Una validación adicional útil sería una revisión ciega por profesionales, o resultados independientes de rebajas, transacciones o tiempo de comercialización. Si esos datos no están disponibles, declararlo como limitación; no inventar etiquetas de verdad.

### P0 — Corregir trazabilidad y referencias del dataset

El paquete oficial identifica 94.815 anuncios de Madrid y licencia ODbL 1.0. La publicación correcta es Rey-Blanco, Arbues, Lopez y Paez (2024), DOI `10.1177/23998083241242844`. Documenta precios perturbados aproximadamente ±2,5 % y coordenadas desplazadas. La memoria cita otros autores/año y afirma coordenadas exactas. Véanse [paquete original](https://paezha.github.io/idealista18/) y [artículo original](https://journals.sagepub.com/doi/10.1177/23998083241242844).

La revisión local encontró exactamente **37 duplicados respecto a las 41 columnas originales**: 94.852 menos 37 coincide con las 94.815 filas originales. El pequeño volumen limita su impacto, pero hay que explicar el enriquecimiento y evitar contar duplicaciones del cruce como nuevas observaciones. La separación por ASSETID comprobada no comparte identificadores entre train y test; no atribuimos a estas 37 filas una fuga entre ambos conjuntos.

El diccionario oficial asigna `BUILTTYPEID_2` a segunda mano para reformar y `_3` a segunda mano en buen estado. El script de renivelado intercambia ambas interpretaciones y describe incorrectamente la composición del dataset. `ISINTOPFLOOR` significa última planta y no necesariamente ático. Fuente: [diccionario de Madrid_Sale](https://paezha.github.io/idealista18/reference/Madrid_Sale.html).

**Acción:** fijar la versión exacta del origen, conservar licencia y cita, reconstruir el cruce con cardinalidad comprobada y documentar año de cada capa de alquiler/catastro. La ausencia de dependencia algebraica del precio no garantiza que una señal estuviera disponible en 2018: hace falta fecharla. La bandera `sec_dudosa` aparece en el 91,44 % de las filas; revisar su definición y unidad antes de usarla como evidencia de calidad.

### P0 — Aislar conversaciones y favoritos

Las rutas aceptan identificadores del cliente sin verificar una identidad de servidor; las consultas usan `service_role`. Sin filtro de usuario se pueden listar conversaciones y los favoritos actuales usan el mismo usuario `anon`. El SQL suministrado no define RLS. Esto está confirmado en el código; no se leyeron ni borraron datos privados de producción para demostrarlo.

**Acción:** para la entrega, elegir entre persistencia únicamente local por navegador o identidad verificada con autorización por propietario en cada ruta y políticas RLS apropiadas. Un UUID enviado por el cliente no es autenticación. Probar aislamiento con dos sesiones y rechazo de lectura/borrado de recursos ajenos. El chat también genera un UUID provisional diferente del creado en Supabase y cierra el stream antes de comunicar el definitivo; hay que unificarlo para recuperar las conversaciones.

### P1 — Hacer coherentes agente, datos y promesas

El modelo de valoración participa en el enriquecimiento del panel. El chat no dispone de una herramienta que consulte ese modelo y sus intervalos: `valorar_alquiler` y la comparación de mercado tienen otras fuentes. Las explicaciones redactadas por un LLM no equivalen a atribuciones SHAP del modelo servido.

Las puntuaciones de seguridad/calidad de vida proceden de tablas manuales y afectan al ranking. Necesitan metodología y procedencia verificables o una etiqueta explícita de demostración; no conviene usarlas como resultado científico del TFM. La página pública de datos mostró `REAL` junto a Banco de España «datos de respaldo», periodo 2024-12. También mostró cuatro puntos del IPV etiquetados solo como «2025». El origen de respaldo se pierde al leer ciertas entradas de la caché.

**Acción:** conectar una herramienta `valorar_vivienda` al mismo backend del panel y transmitir valores, intervalos, fecha y límites sin que el LLM los recalcule. Añadir explicaciones locales del modelo realmente desplegado si se promete SHAP. Conservar procedencia/fecha/estado del dato en caché y mostrarlo junto a la recomendación. Si falta evidencia de seguridad, retirarla del ranking de la demo central.

### P1 — Controlar cuota y gasto

El contador de Idealista presupone 100 peticiones al mes, configurable; **no se comprobó que sea la cuota contractual de la cuenta**. El código cuenta y avisa, pero no impide seguir llamando. La afirmación de cambio automático a datos simulados al agotarse la cuota no queda respaldada por esa implementación.

Claude usa Opus 4.6 por defecto en el chat, hasta seis rondas con 4.096 tokens de salida por llamada. El limitador en memoria por IP no es un presupuesto global. La narración del panel usa un modelo separado. No se guardan tokens y coste total por turno.

**Acción:** límite central y persistente de cuota, caché por filtros normalizados, presupuesto de API, límites de historial/entrada y registro de tokens. Ensayos con un conjunto fijo de anuncios, etiquetados como tales. Evaluar un modelo conversacional más barato con consultas representativas antes de cambiarlo. El ahorro puede ser mayor aquí que migrando Fly.

El proxy público `POST /api/valoracion` añade el token del backend y carece de límite de lote y rate limit: proteger también esta puerta con control de acceso adecuado, tamaño máximo y cupo de peticiones. Propagar cancelaciones hasta el proveedor: el timeout de narración con `Promise.race` y el botón de detener chat no garantizan que se interrumpa la llamada cobrable.

### P1 — Resolver errores en la calculadora secundaria

El harness local encontró un caso con cruces múltiples entre los patrimonios en el que el resultado final favorece alquilar en 22.364 euros, pero el texto afirma comprar por esa cantidad. La exención de la ganancia se activa con el booleano `viviendaHabitual` aunque la propia interfaz menciona condiciones adicionales; es un supuesto insuficientemente representado en el contrato, sin hacer aquí una validación tributaria.

**Acción:** decidir con el patrimonio al horizonte seleccionado y representar los cruces por separado. Hacer explícitos los supuestos fiscales. Corregir y verificar esos casos antes de incluir la calculadora en la defensa; no necesita ocupar el centro de un TFM de valoración.

## Ajustes imprescindibles de la memoria y la presentación

La guía valora análisis, comparación de técnicas, justificación, interpretabilidad, conclusiones comprensibles para negocio, reproducibilidad y productivización. Estas piezas ya existen en grado importante. Exige como máximo 20 caras de contenido, incluyendo bibliografía, sin portada, índice ni anexos.

El PDF de memoria tiene 22 páginas, de las que 20 son contenido. Sin embargo, utiliza tamaño Letter y debe revisarse frente al formato solicitado. La portada dice **31 de septiembre de 2026**, una fecha inexistente. El índice de memoria y anexos está vacío y conserva instrucciones para actualizarlo. Los recursos finales contienen «Repositorio del equipo en GitHub» y «Google Drive del proyecto» en lugar de enlaces efectivos.

Correcciones concretas:

1. Unificar modelo candidato de 58 variables, laboratorio seleccionado de 54 y servicio de 35. La presentación web llega a llamar «Producción» al de 54 variables y 8,20 %.
2. Incorporar una tabla de rendimiento realmente servido y separar 2018 de la aplicación exploratoria en 2026. El factor ×1,5534 está guardado en un manifiesto; un script manual no demuestra actualización automática trimestral.
3. Corregir bibliografía, licencia, coordenadas y diccionario, y añadir los enlaces exactos accesibles al tribunal.
4. Sustituir afirmaciones de valor real, estafa, ahorro y validación económica independiente por conclusiones compatibles con precios de oferta.
5. Corregir el porcentaje restante tras limpieza: 93.619 / 94.852 es **98,70 %**, no 93,7 %. Separar media y mediana de superficie: la mediana original es aproximadamente 83 m², no 101 m².
6. Corregir la explicación de pérdida cuantílica: en el cuantil 5 % se penaliza más sobreestimar que subestimar. No presentar coeficientes hedónicos o SHAP como efectos causales.
7. No justificar el escalado de coordenadas por un supuesto sesgo de los umbrales de árboles: el escalado monótono por eje no cambia su orden. Sí importa para distancias euclidianas y vecinos.
8. Diferenciar filtrado de extremos de winsorización, y redundancia de variables de verdadera fuga del objetivo. Alquiler por m² multiplicado por superficie no depende necesariamente del precio de venta.
9. Actualizar índices, fechas y formato, volver a exportar y comprobar paginación/figuras. La memoria, anexos, PPT, web y guion deben compartir las mismas cifras.

Conviene conservar los resultados negativos: poca ganancia del stacking, codificaciones que no mejoran y dificultad en barrios nuevos. Son una contribución defendible si el protocolo permite medirla. El documento previo de estado da por finalizado el trabajo analítico; esta auditoría identifica revisiones metodológicas que deben resolverse antes de mantener esa conclusión.

## Alojamiento durante un mes

**Recomendación: mantener la web en Vercel y recuperar una sola máquina Fly durante la defensa.** Es el cambio de menor esfuerzo porque el Dockerfile y la conexión ya existen. La tabla oficial para París (`cdg`) fija shared-cpu-1x con 512 MB en **3,62 USD por 30 días de ejecución continua**, antes de impuestos y extras. No es una factura cerrada: falta comprobar número real de máquinas y recursos asociados. [Precios de Fly](https://fly.io/docs/about/pricing/).

| Backend | Coste orientativo | Evaluación para este TFM |
|---|---:|---|
| Fly, una máquina 512 MB en París | 3,62 USD / 30 días + extras | Opción recomendada por continuidad y poco trabajo |
| Fly, una máquina 1 GB en París | 6,46 USD / 30 días + extras | Alternativa si la medición del contenedor exige más margen |
| Render Free | 0 USD dentro de límites | Se duerme a los 15 minutos; despertar alrededor de un minuto excede el timeout actual de 10 segundos |
| Render de pago 512 MB | 7 USD / mes + extras | Docker sencillo, pero migrar no ahorra respecto a Fly |
| Railway Hobby | Mínimo 5 USD / mes, incluye 5 USD de uso | Consumo adicional facturable; la prueba es crédito temporal, no servicio permanente gratuito |
| Hugging Face Docker Spaces | Plan PRO de 9 USD / mes; CPU Basic 0 USD/h | La documentación actual exige plan de pago para crear Spaces con cómputo |

Fuentes de alternativas: [Render Free](https://render.com/docs/free), [planes Render](https://render.com/docs/compute-plans), [Railway](https://railway.com/pricing), [requisitos HF Spaces](https://huggingface.co/docs/hub/spaces-overview), [precios HF](https://huggingface.co/pricing). Tarifas consultadas el 8 de septiembre de 2026; verificar la pantalla de contratación antes de pagar.

La configuración local mantiene una máquina despierta. Conservar ese ajuste durante la defensa evita arranques fríos a cambio de pocos dólares. La auditoría midió un pico de **344 MiB en macOS arm64** al importar el valorador, cargar artefactos y valorar 60 anuncios con un hilo. No es una medición del contenedor Linux con FastAPI; hay que verificar ese entorno y usar un solo worker antes de asegurar que 512 MB bastan. El README declara una medición anterior de 146 MB, distinta de esta. Evidencia en `memoria_runtime.json`.

El presupuesto completo incluye Claude. Opus 4.6 cuesta 5 USD por millón de tokens de entrada y 25 USD por millón de salida. Con el supuesto ilustrativo de 20.000 tokens de entrada acumulados y 2.000 de salida por turno, 100 turnos costarían 15 USD, y Fly elevaría ese ejemplo a **18,62 USD**, antes de impuestos/extras. No se ha medido el consumo real ni equivale a 100 búsquedas. [Precios Anthropic](https://platform.claude.com/docs/en/about-claude/pricing).

Como presupuesto de trabajo propondría **20–30 euros para el mes**, sujeto a aprobación del equipo y límites efectivos de uso, manteniendo Vercel y Supabase en planes gratuitos si la cuenta y el uso lo permiten. Si el presupuesto es cero, la solución más fiable para la exposición es el valorador local y casos preparados, con una grabación de respaldo. `MOCK_IDEALISTA=true` por sí solo no elimina dependencias de internet.

Vercel Hobby es gratuito bajo sus condiciones de uso personal no comercial; Supabase Free puede pausarse tras periodos de inactividad. Comprobar las cuentas reales antes del ensayo. Fuentes: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase precios](https://supabase.com/pricing), [pausas Supabase](https://supabase.com/docs/guides/platform/free-project-pausing).

## Plan propuesto para cuatro semanas

No se ha confirmado la fecha de entrega ni presupuesto. Este calendario es una propuesta de secuencia y alcance, no una fecha comprometida.

| Periodo | Trabajo | Resultado comprobable |
|---|---|---|
| Primeras 48 horas | Recuperar servicio, revisar recursos y gasto, estado visible, aislamiento de datos, congelar alcance Madrid/venta | Una valoración real identificada como modelo; caída explícita; sesiones aisladas; presupuesto definido |
| Semana 1 | Corregir protocolo de selección, deduplicación y diccionario; función común de variables; validación de dominio | Pipeline único y particiones documentadas, sin usar test para elegir |
| Semana 2 | Reentrenar/configurar lo necesario; recalibrar; métricas por segmento; contrastar un lote actual independiente | Tabla laboratorio–servicio; errores/cobertura con tamaños de muestra; análisis de deriva |
| Semana 3 | Integrar valoración y explicación en chat; procedencia/caché; cuotas; pruebas con usuarios | Casos completos repetibles y resultados de una evaluación de utilidad |
| Semana 4 | Corregir memoria/anexos/guion, enlaces y versiones; ensayos y respaldo | Paquete de entrega accesible, demo local y remota verificadas, defensa dentro del tiempo asignado |

Una muestra actual de 200–500 anuncios, si hay tiempo y acceso autorizado, sería un objetivo de trabajo útil; no garantiza representatividad por distrito ni potencia estadística por sí sola. Separar calibración y evaluación, controlar duplicados, fecha y mezcla de barrios/precios. Con una muestra menor, tratarla como piloto. No revalidar el factor 2018→2026 en los mismos datos usados para ajustarlo.

Para un equipo de cinco, repartir provisionalmente: datos y trazabilidad; modelos y evaluación; servicio e infraestructura; integración/pruebas del producto; memoria y evaluación con usuarios. Todos deben entender objetivo, métricas, incertidumbre y límites para responder al tribunal.

Si solo queda una semana, priorizar disponibilidad, privacidad, coherencia del recorrido de inferencia y exactitud documental. Reducir funciones de demo a una vivienda en venta en Madrid y un segundo caso incierto. Mantener la evaluación actual como exploratoria si no puede rehacerse correctamente; una limitación explicada es preferible a una afirmación que el código contradice.

## Qué aportaría una defensa especialmente sólida

Propuesta de título: **Estimación del precio de oferta de vivienda en Madrid y detección de anuncios atípicos con incertidumbre calibrada**. HabitIA puede figurar como nombre del sistema y de su aplicación.

La pregunta principal puede ser: «¿Cuánto mejora un modelo que considera vivienda y localización frente a una referencia por barrio, y cómo cambia esa mejora cuando solo recibe los datos disponibles en una aplicación real?».

La exposición debería mostrar un caso concreto, la referencia sencilla, la predicción, su intervalo, una explicación verificable y un caso en el que el sistema se abstiene. Una diapositiva de laboratorio frente a servicio, y otra de límites temporales/geográficos, hacen visible el criterio técnico del equipo.

Como evidencia de utilidad, proponer una comparación con 8–12 participantes y tareas equivalentes, alternando el orden de las interfaces: tiempo para formar una lista corta, errores al interpretar precio/intervalo y comprensión de las limitaciones. Es un estudio piloto de usabilidad, no una prueba estadística concluyente. Si se obtienen revisiones ciegas de especialistas, mantenerlas separadas de los datos usados para definir las señales.

Antes de entregar deberían cumplirse estos criterios:

- Predicciones reproducibles desde datos/versiones identificados y una única preparación de variables.
- Selección y calibración separadas de la evaluación; si no, limitación explícita.
- Métricas correspondientes al artefacto realmente servido y al contrato web comprobado.
- Cobertura y anchura con desglose suficiente, sin promesa individual o para 2026 no validada.
- Respuesta clara ante datos insuficientes, fuera de dominio o backend caído.
- Ninguna sesión puede leer o borrar los recursos de otra.
- Cuota y presupuesto limitados; demo sin depender de una prueba temporal.
- Memoria de extensión correcta, índices completos, bibliografía verificable y enlaces accesibles.
- Respaldo local probado y grabación de un recorrido real; datos simulados identificados.

## Archivos de evidencia

- En este repositorio: `docs/auditoria_2026-09-08/app_revision.md`, `app_checks.cjs` y `app_checks_resultados.json`.
- En la carpeta hermana: `memoria/auditoria_2026-09-08/verificar_modelo.py`, `verificar_modelo.log`, `metricas_verificadas.json` y `memoria_runtime.json`.
- Resultados históricos cotejados: `memoria/resultados/modelos.json`, `seleccion.json`, `servicio.json`, `oportunidades.json`, `contrastes.json` y `renivelado.json`.
- Documentos contrastados: guía UCM aportada, memoria/anexos/presentación en PDF y fuentes DOCX/guiones.

El objetivo de este plan es aumentar la solidez y la capacidad de defensa del trabajo. La calificación depende del tribunal; la evidencia disponible permite orientar el esfuerzo, no prometer un resultado académico.

## Reproducibilidad y detalle técnico complementario

Los archivos [app_revision.md](app_revision.md) y `memoria/auditoria_2026-09-08/modelo_hallazgos.md` contienen la revisión ampliada. Incluyen problemas secundarios de emparejamiento de barrios homónimos, transporte público aproximado representado como exacto, cancelación de llamadas, filtros imprescindibles tratados como preferencias, y validación débil de JSON.

La reproducción desde los artefactos guardados funciona, pero falta cerrar la reproducción desde las fuentes originales: lock de dependencias, script de enriquecimiento territorial, versiones y hashes. Además, regenerar el manifiesto con `10_servicio.py` omite la sección de alquiler que contiene el artefacto actual; los scripts de compactación también modifican modelos y manifiesto. El comando documentado debe regenerar el estado completo que se entrega, no una versión anterior parcialmente equivalente.

Las comprobaciones HTTP locales de casos fuera de dominio se guardan en `api_limites.json`. Usaron un FastAPI más reciente que la restricción del Dockerfile; verifican la lógica del código, pero no sustituyen una prueba de la imagen de producción fijada. Las mediciones locales de memoria tampoco deben confundirse con límites garantizados en Linux.
