# Revisión de la presentación HabitIA v8

Se revisaron las tres páginas y las cuatro imágenes de «Dudas mauri presentacion v8.docx». Las correcciones se aplican a la presentación web vigente y al vídeo que contiene. El Word original se conserva como referencia.

## Cambios por apartado

| Apartado | Resultado |
| --- | --- |
| 0 Portada | Sin cambios solicitados. |
| 1 Problema | «Buscar agota. Decidir exige contexto.» está en la cabecera, entre «El problema» y la línea divisoria. |
| 2 a 6 Oportunidad, solución, propuesta de valor, metodología y motor de decisión | Se conservan los apartados marcados como OK. |
| 7 Modelo de pricing | Título solicitado, «El verdadero valor del inmueble, según sus características». Output corregido a «Precio de compra de 2018». Se retira la etiqueta tachada «Propuesta 2026» y se sustituyen las fórmulas de 2026 por el cálculo que realmente ejecuta el paquete. |
| 8 Comprar vs alquilar | Se conserva el apartado marcado como OK. |
| 9 Demo | Se sustituyen las escenas de resultados, ficha y Score entre 68 y 88 segundos por capturas nuevas. Se usa una vivienda ficticia de compra para mostrar los cuatro componentes calculables, el servicio XGBoost conectado y una ruta de bicicleta de OpenRouteService. Se actualizan los subtítulos. |
| 10 Roadmap y cierre | Se conservan los apartados marcados como OK. |
| Anexos de Score, arquitectura y modelo | Se conserva su contenido. Las notas de exposición distinguen el diseño por percentiles del anexo y las escalas provisionales que utiliza la aplicación. |

## Qué ocurre con las fechas del modelo

El código del servicio y sus metadatos confirman tres fechas distintas: entrenamiento y precio base de 2018, venta indexada a 2025 y factor mensual de renta de 2024. El factor de venta utilizado es distrital; no se debe presentar como si fuera automáticamente el IPV autonómico del INE.

La observación del documento es correcta si se refiere a presentar esos importes como una valoración actual validada de 2026. El alquiler combina una venta indexada a 2025 con una relación renta/precio de 2024: es un escenario derivado, sin validación independiente de alquiler. Eso no invalida por sí solo las métricas declaradas del test histórico, pero tampoco demuestra precisión actual. La nueva diapositiva muestra estas fechas y esta limitación.

El [INE publicó el IPV del segundo trimestre de 2026 el 7 de septiembre](https://www.ine.es/dyngs/Prensa/IPV2T26.htm). Su disponibilidad no resuelve por sí sola la actualización del paquete: hay que comprobar ámbito geográfico, tipo de vivienda, periodo y base de la serie; enlazar correctamente la referencia de 2018; actualizar el factor de renta con una fuente compatible; adaptar el contrato de la API y validar con anuncios recientes. No se han cambiado los pesos ni se han sustituido datos históricos por cifras de 2026 sin esa comprobación.

**Pendiente para una valoración de 2026:** actualizar y validar el modelo y sus factores. Lo resuelto en esta revisión es que la presentación ya no atribuye al paquete una actualización que no tiene.

El título «El verdadero valor» se reproduce como se solicita. Para explicarlo ante el tribunal: «Nuestro objetivo es aproximar el valor según las características; técnicamente el modelo estima precios anunciados y conserva las limitaciones que se muestran».

## Cálculos que aparecen en la nueva demo

Ejemplo reproducido con el anuncio sintético `mock-centro-1`, distrito Centro, precio anunciado 306.000 euros y pesos iguales del 25%. El modelo y el proveedor de rutas respondieron correctamente; las capturas reutilizan esas respuestas sin alterar los resultados.

| Componente | Resultado | Interpretación |
| --- | --- | --- |
| Fair | 100 | Comparación del anuncio con la estimación indexada a 2025 mediante la regla lineal provisional de la aplicación. No es un porcentaje de confianza. |
| Opportunity | 52,8 | Variación anual de venta del distrito frente a Madrid. Solo aplica a compra. |
| Zone | 40,5 | Puntuación parcial con 4 de los 5 indicadores del distrito; falta ruido. |
| Lifestyle | 86,7 | Resultado de un trayecto en bici de 17 minutos. |
| Cobertura | 95% | Tres componentes completos y el 80% del peso de Zone: 25 + 25 + 20 + 25. |
| Puntos acumulados | 70 de 100 | Suma ponderada redondeada. La interfaz mantiene «Evaluación parcial» porque la cobertura no es completa. |

No se ha rellenado el indicador de ruido ni se ha atribuido una oportunidad de inversión a un alquiler. El vídeo conserva su duración de 106 segundos y la música anterior. La escena de resultados anuncia expresamente el cambio a un ejemplo de compra en Centro, para distinguirlo del perfil de alquiler que se muestra antes. Las fuentes editables están en `videos/habitia-demo/revision-v8/`, junto al proyecto web, dentro del directorio del TFM. HyperFrames se actualiza de 0.8.38 a 0.8.40 para esta revisión.

## Corrección del recorrido al trabajo

El enriquecimiento solicitaba el trayecto del trabajo a la vivienda. Se invierte para consultar vivienda → trabajo, lo que importa en calles de sentido único. En el ejemplo, OpenRouteService devuelve 163 coordenadas y 17 minutos en bicicleta. El mapa conserva esa geometría.

Si no llega geometría válida, el mapa deja de construir una recta entre los dos puntos. Los tiempos aproximados pueden seguir disponibles, con el aviso de recorrido no disponible. La referencia por carretera del transporte público se identifica como tal; no se presenta como itinerario de transporte público.

## Comprobaciones

- Lectura completa del Word y revisión visual de todas sus páginas e imágenes.
- Presentación revisada en escritorio de 1920 × 1080 y 1366 × 768, y adaptación móvil.
- API de recomendaciones comprobada con anuncios ficticios, modelo conectado y rutas de OpenRouteService.
- Pruebas de regresión para geometría, fallo del proveedor, coordenadas inválidas, trayectos de cero minutos y sentido vivienda → trabajo.
- Suite del proyecto, TypeScript, lint y compilación de producción correctos.
- Vídeo final de 106 segundos y 1920 × 1080 revisado con HyperFrames y capturas de las tres escenas sustituidas. Pista de audio idéntica a la anterior; comparación de siete puntos conservados con similitud SSIM superior a 0,99. Incorporado a `public/presentacion/habitia-demo.mp4`.

Los cambios quedan en el proyecto local. Esta revisión no modifica el despliegue público ni las entregas académicas archivadas.
