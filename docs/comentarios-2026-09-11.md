# Comentarios de plataforma v5 y presentación v3

Cambios en la plataforma y en la presentación web `/presentacion`. Los documentos de comentarios se han tratado como material de revisión. La petición directa de eliminar los anexos prevalece sobre las propuestas del documento de ampliarlos. El usuario confirmó utilizar indicadores oficiales de barrio.

## Plataforma

| Comentario | Resultado |
| --- | --- |
| Cuatro subscores o ninguno en la tarjeta | Retirado el bloque parcial de precio/trayecto. Los cuatro componentes permanecen juntos en el desplegable. |
| «Cobertura de pesos» | Sustituida en el resumen por «Ver los cuatro componentes». Dentro se explica qué proporción de las prioridades ponderadas puede evaluarse y que los pesos sin datos no se redistribuyen. |
| «Estimación individual» en Detalles | Se utiliza «Valoración no disponible». |
| Favorito cuyo anuncio se retira | La copia guardada permanece hasta quitarla manualmente. No existe comprobación automática de disponibilidad. Aviso también en la pestaña de favoritos del panel. |
| Uso del valor tasado provincial | Contexto provincial en las consultas de mercado. No determina el precio de una vivienda, el factor temporal ni el score. |
| IPV de 2026 | Sustituida la tabla INE 25171, base 2015, por la 79563, base 2025. Se descarga de nuevo todo el histórico desde 2018 en una misma base. Nueva versión de caché para impedir reutilizar la tabla anterior. Verificado Q2 2026: índice nacional 111,095, variación anual 12,2%; índice de Madrid de segunda mano 112,649. El artefacto del modelo conserva su escenario versionado. |
| Uso de referencia de alquiler | Serviría para contrastar la renta del anuncio con una referencia comparable. Sigue sin haber una referencia de alquiler validada integrada; no se inventa una renta a partir del precio de venta. |
| Tabla de barrios y fuente | 131 barrios de Madrid: superficie en ha, población y densidad en habitantes/ha, a 1 de enero de 2026. Tabla municipal original enlazada. Se retiran los párrafos del bloque. Los datos territoriales no se convierten automáticamente en un score de seguridad/calidad de vida. |
| Cinco notificaciones | Ya estaba implementado el máximo de cinco y la migración aplicada en la revisión anterior. Se conserva el mismo score y el límite del recomendador, con menos resultados si faltan candidatas. No se fuerza una selección de cinco anuncios inexistentes o incompatibles. |

Fuente IPV: [INE, tabla 79563, base 2025](https://www.ine.es/jaxiT3/Tabla.htm?t=79563). El [INE explica el cambio de base](https://www.ine.es/dyngs/Prensa/IPV1T26.htm): la serie histórica también se publica en la nueva base. El cociente frente a la media de 2018 se calcula con niveles de esa misma serie.

Fuente barrios: [Ayuntamiento de Madrid, superficie, densidad y población](https://www.madrid.es/UnidadesDescentralizadas/UDCEstadistica/Nuevaweb/Territorio%2C%20Clima%20y%20Medio%20Ambiente/Territorio/Datos%20geogr%C3%A1ficos%20y%20administrativos/N110326.xlsx). Copia estructurada en `lib/neighborhood/madrid-official.json`, con periodo, fecha de consulta y SHA-256 del fichero original. La suma de los 131 barrios coincide con los 3.497.277 habitantes publicados para la ciudad. Estos indicadores sustituyen la tabla manual; no miden tranquilidad, seguridad, servicios ni revalorización.

## Presentación

| Comentario | Resultado |
| --- | --- |
| Portada limpia | Retirados «Defensa · 10 minutos», «Datos + scoring + IA conversacional» y el botón de inicio. Pista discreta de teclado/clic. |
| Problema anterior + métricas | Recuperada la composición anterior del historial: «Más anuncios. Menos claridad» y los cuatro problemas. Añadidos +12% y +13%, periodo y cifras exactas. |
| Solución | Flechas entre pasos y frase «¿Resultado? Ahorra tiempo y esfuerzo al encontrar tu piso». Se conserva la aclaración de que el ahorro está pendiente de medición con usuarios. |
| Propuesta de valor | Los bloques cuatro y cinco quedan centrados debajo de los tres primeros. |
| Metodología | Incluye recogida, EDA, comparación de modelos, validación por activo, calibración, SHAP, servicio, interfaz, persistencia, despliegue, conversación y automatización. Se hace explícita la separación de calibración y los límites temporales. |
| Pricing | Dos bloques verticales: cómo aprende el modelo y cómo se presentan compra/alquiler en 2026. No se atribuye un modelo operativo al alquiler. |
| Comprar frente a alquilar | Texto solicitado de patrimonio, gastos, capital invertido y perspectivas personales. Se aclara que mudanzas/cambios laborales no generan flujos automáticos en el simulador. |
| Demo | Capturas nuevas de la aplicación local, con anuncios sintéticos identificados. Retirada de 1:41–1:43, duración verificada de 106 segundos. Corregido también un cue VTT que tenía tres marcas de tiempo. |
| Roadmap | «Desplegar» y «HabitIA» en líneas distintas. |
| Anexos | Eliminadas sus once escenas y el grupo del selector. Recorrido único de 12 diapositivas. |
| Interacción | Flecha derecha, espacio o clic en la diapositiva revelan el siguiente bloque. Tras el último bloque se avanza. Flecha izquierda deshace un paso; al volver a la diapositiva anterior, se muestra completa. La demo se reproduce al entrar y se pausa al salir. Controles secundarios ocultos por defecto, disponibles con H. F activa pantalla completa; N abre las notas. |

No se ha localizado el PPT v11 en el proyecto ni en Descargas; se solicitó su ubicación. La restauración del problema se basa en la versión anterior del repositorio. Queda pendiente el contraste exacto de problema y pricing con ese fichero. No se han alterado los PPTX históricos.

## Verificación

Compilación de producción, TypeScript, lint, regresiones de datos y scoring, pruebas generales de aplicación. Descarga real del INE con 34 trimestres desde Q1 2018 hasta Q2 2026. Comprobación de 131 filas de barrios, su población total y lectura de Datos en móvil. Navegador: avance por clic/teclado, retroceso de animaciones, reproducción y pausa del vídeo, Home/End y ausencia de anexos. La demo utiliza capturas de una instancia local sin escrituras en Supabase ni consultas a Idealista.

La publicación remota no forma parte de esta revisión local.

Vídeo final: H.264, 1920 × 1080, 106 segundos y audio AAC. Revisados ocho fotogramas del MP4, incluido el encuadre corregido del score (84–88 s). Comprobación de las doce diapositivas completas en la compilación de producción, sin errores de ejecución.

## Ajuste posterior solicitado

Se retira de «Filtrar, calcular y ordenar» la fila «Perfil + filtros → hasta 8 candidatos → hasta 5 recomendaciones». Los límites existen en lib/recommend.ts, pero se omite ese detalle interno de la exposición. Se recuperan los once anexos anteriores por petición expresa posterior. Las doce diapositivas principales mantienen sus cambios; después del cierre se puede continuar con flecha derecha o clic hacia los anexos, o elegirlos en el selector (H). Este ajuste sustituye la decisión anterior de eliminarlos.
