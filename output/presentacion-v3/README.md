# HabitIA · presentación con evidencia interactiva

La presentación mantiene 14 escenas principales, el promocional de 54 segundos en la apertura, la demo de 75 segundos en la escena 13 y el cierre personal. Hay cinco anexos, incluido el nuevo de interpretabilidad.

## Cambios y uso durante la defensa

- **Escena 3 — vivienda en contexto:** maqueta conceptual propia de HabitIA. Los tres controles conectan vivienda, entorno y decisión. Imagen generada con la herramienta integrada imagegen, identificada como conceptual.
- **Escena 5 — preparación:** una banda proporcional muestra los 94.852 registros originales, la depuración y la partición 70.203 / 23.416. Los controles permiten recorrer las tres etapas.
- **Escena 7 — modelos:** empieza en «El avance». «7 modelos» permite responder sobre alternativas; «La localización» muestra la ablación. La escala empieza en cero y se mantiene al cambiar de vista.
- **Escena 8 — incertidumbre:** el precio anunciado puede moverse con ratón, tacto o teclado. El ejemplo sigue siendo ilustrativo. A la derecha, «Sin calibrar / Con calibración» muestra la cobertura real: 72,36 % → 89,77 %, frente a un objetivo de 90 %.
- **Escena 9 — alcance:** comparación de prueba reservada, futuro inmediato y barrios no vistos. El detalle muestra los cinco resultados espaciales. Los puntos no son intervalos de confianza.
- **Anexo 5 — SHAP:** participación por bloques de información, con la distinción entre importancia del modelo y causalidad.

El recorrido normal está presupuestado en 9:39. Los controles de detalle están pensados para elegir durante el ensayo o usarlos al responder al tribunal; no es necesario recorrer todas sus variantes.

## Datos y recursos

`app/presentacion/results-data.json` contiene la selección de cifras de cuatro fuentes del TFM: `modelos.json`, `seleccion.json`, `oportunidades.json` e `interpretabilidad.json`, en `memoria/resultados/`. Se mantienen sus valores originales y se redondean únicamente las etiquetas.

- `graficas/resultados-habitia.pdf`: cinco figuras para compartir o llevar como respaldo.
- `graficas/*.svg`: figuras vectoriales editables.
- `graficas/*.png`: versiones raster.
- `export_charts.py`: exportación reproducible con Matplotlib.
- `imagen-prompt.md`: modo de generación, procedencia y prompt final completo.
- Imagen integrada: `public/presentacion/habitia-contexto-v1.png`.
- Las capturas JPEG documentan la comprobación visual de la presentación.

## Movimiento y accesibilidad

Las barras usan un resorte críticamente amortiguado que conserva posición y velocidad al cambiar el destino. Solo anima `transform`; se detiene al asentarse o al salir de la escena. La imagen y la cadena del agente usan entradas breves, sin bucles.

Se respeta `prefers-reduced-motion` y se ofrece «Reducir movimiento» en las notas del ponente. La interacción permanece disponible durante las transiciones. El reloj actualiza el estado visual una vez por segundo, en lugar de volver a renderizar la presentación en cada fotograma. No se añadieron bibliotecas de animación.

## Verificación

- TypeScript, ESLint y comprobación de espacios de Git sin errores.
- Valores, partición y denominadores contrastados con las fuentes originales.
- Comparación de modelos, etapas de datos, calibración, precios bajo/dentro/sobre el intervalo y detalles espaciales comprobados en el navegador.
- Modo de movimiento reducido comprobado: transformaciones de escena desactivadas y barras en su valor final.
- Revisión a 1280 × 720 y a 390 × 844. Las vistas estrechas permiten desplazamiento vertical; sin desbordamiento horizontal en las gráficas comprobadas.
- El aviso transitorio observado durante edición correspondía al recargador CSS de Next.js; se inspeccionó la traza y se recargó la página.

Para repetir las exportaciones: `python3 output/presentacion-v3/export_charts.py`.
