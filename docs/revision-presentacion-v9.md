# Demo de presentación · revisión v9

15 de septiembre de 2026. Actualiza el vídeo de `/presentacion` con la jerarquía visual del HabitIA Score y el gráfico de comprar o alquilar solicitado por el usuario.

## Montaje

- **0–68 s:** conserva la historia de João y la preparación del perfil.
- **68–77 s:** resultados del ejemplo de compra en Centro, con recorrido de 17 minutos en bici hasta Nuevos Ministerios y el nuevo HabitIA Score visible.
- **77–84 s:** ficha actual de la misma vivienda ficticia.
- **84–88 s:** primer plano del total **73/100**, con cobertura **100%**, Fair 100, Opportunity 52,8, Zone 50,6 y Lifestyle 86,7. Pesos iguales. Zone usa cuatro indicadores al 25%; se retira la explicación antigua del ruido pendiente.
- **88–94 s:** metodología actual. Opportunity utiliza el mismo indicador de venta en compra y alquiler; Zone dispone de sus cuatro indicadores.
- **94–106 s:** gráfico completo de patrimonio, con horizonte de **18 años** y equilibrio en **9,8 años**, cerca del centro del eje, como la referencia aportada. Capital final: comprar **338.318 €**, alquilar e invertir **292.153 €**, en euros de hoy.

Se mantienen 106 segundos, 1920×1080 y 30 fps, con la música original continua. Los subtítulos y las notas del presentador se actualizan; las URLs de vídeo y subtítulos usan la versión 9 para evitar reutilizar la anterior en caché.

## Capturas y reproducibilidad

Proyecto editable: `../videos/habitia-demo/revision-v9/index.html`.

Las capturas se hicieron con el código de la aplicación actual en una copia local aislada. La valoración XGBoost y la ruta OpenRouteService reproducen la respuesta guardada en la revisión v8; los scores se recalculan con el código actual. No se presentan como nuevas consultas ni como anuncios reales. Las capturas y la respuesta original están en `revision-v9/assets` y `revision-v9/evidence`.

La calculadora utiliza sus valores iniciales; únicamente se cambia el horizonte de la captura a 18 años. No se modifica el horizonte por defecto de la aplicación ni su fórmula. El resultado del ejemplo depende de sus supuestos.

## Verificación

- HyperFrames: comprobación de estructura, ejecución, encuadre y contraste; inspección visual de las escenas modificadas.
- `verify.py`: formato y duración, muestras en cortes y escenas, comparación SSIM de los primeros 68 segundos y coincidencia exacta del flujo de audio con la versión anterior.
- Resultado técnico: `../videos/habitia-demo/revision-v9/verified/report.json`.
- TypeScript del proyecto: `npm run typecheck`.

El vídeo sustituye el archivo local `public/presentacion/habitia-demo.mp4`. Esta revisión no realiza un despliegue.
