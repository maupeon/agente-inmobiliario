# Memoria final revisada

`HabitIA_memoria.tex` es la fuente editable; `HabitIA_memoria.pdf` contiene la memoria y los catorce anexos. `README.html` abre el documento y enlaza el código y los materiales técnicos.

## Cambios de contenido

- Retiradas las fechas de publicación y exportación, las referencias al sistema operativo y la terminología técnica «contrato». Se conservan los periodos de los datos, las versiones y las rutas necesarias para reproducir resultados.
- Corregidas las etiquetas del HTML: las métricas comparan con precios anunciados y las 75.469 viviendas forman el conjunto total (60.375 de entrenamiento y 15.094 de prueba).
- Documentada la exploración inicial del conjunto completo en los cuadernos 01 y 02. La selección del cuaderno 03 usa entrenamiento y criterios de ajuste/BIC; la comparación y el ajuste de modelos usan validación cruzada. El test no estuvo aislado de toda la exploración previa.
- Unificado el denominador del contraste de 2026 con el del error histórico: precio anunciado. En las 412 observaciones válidas, la desviación porcentual mediana es 12,9 % y el 68,4 % queda dentro de ±20 %. El 13,2 % y el 67 % anteriores usaban la estimación como denominador.
- Aclarados la corrección de retransformación a euros, las métricas logarítmicas previas al smearing, el descarte de un anuncio sin barrio y el límite conservador de 367 m².
- Corregidas la persistencia global del historial y los favoritos, la separación por navegador de las notificaciones y la advertencia de obra nueva, que no impide estimar.
- Recuperadas las figuras ausentes. La captura de conversación no estaba incluida: se ha sustituido por un diagrama del flujo implementado. Las capturas de interfaz identifican los ejemplos sintéticos.
- Eliminadas referencias a páginas fijas; ajustados índices, enlaces y numeración de anexos.
- Ampliado el trabajo futuro con la calibración del HabitIA Score mediante percentiles de distribuciones de referencia y su actualización con nuevas observaciones. Se distingue esta calibración de los intervalos de predicción, se reconoce que Zone ya utiliza percentiles y se exige otra muestra de evaluación si el test actual se usa para ajustar las escalas. La síntesis de conclusiones se ha compactado para conservar las 19 páginas de contenido y una de bibliografía.

## Ajuste al límite de extensión

- El contenido principal ocupa las páginas numeradas 1–19 y la bibliografía completa ocupa la página 20. Las portadas, los índices y los anexos quedan fuera de esas veinte páginas.
- El capítulo de la aplicación conserva la arquitectura, el recorrido de búsqueda, una explicación del asistente, el cálculo y las limitaciones del Score y las dos capturas de interfaz.
- El catálogo de herramientas, el diagrama del asistente y los detalles de ejecución se han trasladado al anexo 14.3. Las capturas se han reducido del 90 % al 78 % del ancho de texto y se han eliminado espacios sobrantes a su alrededor.
- Se mantienen el cuerpo de letra de 11 puntos, los márgenes, los resultados científicos, las conclusiones y las trece referencias bibliográficas. Se han comprobado la paginación, los índices, las referencias cruzadas y la maquetación del PDF compilado.

## Procedencia de las figuras y las cifras

Las seis figuras `nb*.png` se extrajeron de las salidas incluidas en los cuadernos del [repositorio del modelo](https://github.com/tomasper17/house-pricing-model-habitia), revisión `b51fdef423bf42b19427216bf06fdbeb031016d5`. No se han recreado resultados estadísticos.

El contraste actual se verificó con `data/api_idealista/predicciones_2026-09-15.csv` de ese repositorio. La sensibilidad se cotejó con `servicio/evidencia_modelo_v3.json` del repositorio `habitia-tfm`: 111 superficies, 39 descensos y salto máximo de −27.291,46875 euros entre 71 y 72 m².

El escudo, la pantalla de inicio y la curva de sensibilidad proceden de los recursos extraídos de la entrega anterior (`HabitIA_Drive/PNGs/figuras`). La ficha procede de `05_verificacion/browser/rent-drawer-desktop.png` del paquete técnico; representa un anuncio ficticio utilizado para comprobar la interfaz.

## Compilación

Desde esta carpeta:

```sh
tectonic HabitIA_memoria.tex
```

También puede utilizarse pdfLaTeX con dos pasadas. La carpeta `figuras/` debe acompañar siempre al archivo LaTeX. Los auxiliares de compilación están excluidos de Git.
