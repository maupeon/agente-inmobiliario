# Comentarios de plataforma y presentación del 10 de septiembre

Revisión de `Dudas mauri plataforma v4.docx` y `Dudas mauri presentacion v2.docx`. Los archivos originales se conservan. Esta entrega actualiza la aplicación y la presentación web en `/presentacion`. El usuario confirmó expresamente las nuevas definiciones del score, dejando sin puntuación los factores que carecen de datos verificables.

## Plataforma

| Comentario | Incorporación |
| --- | --- |
| Nombre del score | HabitIA Score en perfil, resultados, fórmula y desplegable. |
| Cuatro subscores o ninguno | Los cuatro valores, pesos, aportaciones y explicaciones están juntos en el desplegable; la tarjeta no presenta una selección parcial de puntuaciones. Precio y tiempo pueden aparecer como datos del anuncio y en la explicación. |
| Referencia territorial en Detalles | Retirada de la ficha. Si falta el modelo, se explica la ausencia de valoración individual y se enlaza a Datos. |
| Justo en naranja | Color naranja compartido por leyenda, mapa y valoración. |
| Última búsqueda cortada | Las pestañas se distribuyen en varias líneas cuando falta espacio. |
| Nuevas definiciones | Fair compara oferta y estimación. Opportunity compara revalorización de zona y ciudad. Zone representa calidad de vida. Lifestyle puntúa exclusivamente tiempo al trabajo. Peso 0 permite descartar un componente, manteniendo la suma 100. |
| Favorito retirado de Idealista | Se explica que permanece como copia hasta retirarlo manualmente; no hay verificación automática de disponibilidad. |
| Uso de valor tasado provincial | Contexto de las consultas de mercado; no estima el anuncio, actualiza el factor temporal ni aporta score. |
| IPV 2018–2026 | La descarga solicita desde 2018 hasta el último trimestre recibido: índice nacional, variación anual e índice de Madrid de segunda mano. Muestra factores respecto a la media de 2018, sin sumar variaciones interanuales. |
| Uso de referencia de alquiler | Se conserva la explicación del origen y del uso previsto. No existe una referencia oficial integrada ni un modelo de alquiler operativo. |
| Indicadores de barrio | Zone conserva el significado solicitado y aparece sin datos. No se recuperan índices manuales ni se sustituye por proximidad. |
| Trimestres y enlaces | Q1 2025, Q2 2025… y enlaces oficiales, también en el histórico ampliado. |
| Opportunity como inversión | Nombre y definición actualizados en perfil, fórmula, Cómo funciona, asistente y presentación. |
| Cinco viviendas diarias | Trabajador e interfaz pasan a un máximo de cinco, con deduplicación y orden por el mismo score. Migración de base de datos incluida. Con menos candidatas se muestran las disponibles. |
| Exención de la ganancia | La ayuda junto al control explica que simula eliminar el IRPF de la ganancia en la liquidación hipotética. No elimina plusvalía municipal, gastos ni impuestos de la cartera. |
| Vivienda habitual | Por sí sola no elimina el impuesto. La exención simulada requiere ambos interruptores. Se conserva el enlace de AEAT en el glosario. |
| Valores de las barras | Los totales de compra y alquiler aparecen a la derecha, fuera de las barras y alineados en la misma columna. |

Opportunity y Zone no aportan puntos hasta disponer de series comparables de revalorización y de indicadores de calidad de vida con una metodología verificable. Lifestyle no utiliza presupuesto ni imprescindibles como sustitutos del trayecto; esos requisitos siguen actuando como filtros. Con pesos iguales, Fair y Lifestyle disponibles representan una cobertura del 50%. La interfaz indica esa limitación.

## Presentación web

El recorrido principal contiene 12 escenas: portada, problema, oportunidad, solución, propuesta de valor, metodología, motor de decisión, modelo de pricing, comprar frente a alquilar, demo, roadmap y cierre. El detalle previo de datos, validación, resultados, intervalos, alcance, arquitectura, asignaturas y SHAP permanece en anexos, junto al nuevo cálculo del score.

| Comentario | Incorporación |
| --- | --- |
| Portada | HabitIA aumenta de tamaño. |
| Problema | +12% general y +13% segunda mano en grande, redondeados de +12,2% y +12,9%, con periodo y enlace al INE. |
| Oportunidad | Comparación de funciones públicas de búsqueda, valoración y análisis económico, con fuentes y la oportunidad de integración de HabitIA. |
| Solución | Flujo actual y flujo con HabitIA; Acierta, Fácil y Rápido como objetivos de experiencia. |
| Propuesta de valor | Compra/alquiler, top cinco, chat, búsqueda diaria y patrimonio completo. |
| Metodología | Recogida → EDA → modelado → plataforma y despliegue → conversación → automatización, conectado con materias. |
| Motor de decisión | Perfil, filtros, candidatos, fórmula, cuatro componentes y cobertura. |
| Pricing | LightGBM, 25 variables, oferta 2018 y escenario heredado 1,5534 para Q1 2026. Alquiler distingue renta anunciada de valoración no disponible. |
| Comprar/alquilar | Enfoque básico de precio, renta e hipoteca frente a capital invertido, gastos, impuestos, inflación y sensibilidad. No se atribuyen carencias universales a todos los comparadores. |
| Demo | Capturas nuevas, reducción de 136 a 108 segundos y cierre «Al alquilar, puedes invertir lo que queda». La gráfica se adelanta a 1:41 para conservarla antes del corte de 1:43. |
| Roadmap | Cinco viviendas; «Desplegar HabitIA» y validación con usuarios reales; revalorización, visita 2D–3D, más ciudades y pruebas B2C/B2B en ese orden. |
| Cierre | HabitIA · La herramienta que echábamos en falta · Acierta · Fácil · Rápido. |
| Anexo del score | Reglas y ejemplo: pesos iguales, Fair 100, Lifestyle 81, otros sin datos → 45/100 con cobertura 50%. |

Los tiempos orientativos suman 9 min 23 s, dejando 37 s dentro del reloj de diez minutos para transiciones. Los PPTX/PDF históricos de la memoria no se regeneran en esta revisión de la presentación web.

## Datos que siguen pendientes

La API de la tabla 25171 respondió con datos hasta Q4 2025 durante esta revisión. La [publicación de Q2 2026 del INE](https://www.ine.es/dyngs/Prensa/IPV2T26.htm) ya anuncia datos más recientes. No se mezclan bases ni se reconstruyen niveles a partir de tasas redondeadas. La interfaz expone el último periodo recibido y la ausencia de los posteriores.

El factor de servicio sigue siendo el escenario heredado de su manifiesto: 1,5534, Q1 2026, con referencia declarada al IPV de Madrid de segunda mano. Leer el histórico de Datos no cambia el artefacto ni acredita la procedencia completa de ese factor heredado. Tampoco valida la precisión de las predicciones actuales.

## Verificación y publicación

Se comprueban los contratos de score y datos, la selección de cinco viviendas, las regresiones generales y financieras, TypeScript, lint y compilación de producción. La migración se verifica en PostgreSQL 15 desechable: acepta cinco elementos, rechaza seis y conserva permisos, reservas, pausas, deduplicación y reintentos. No se accede a la base remota para estas pruebas.

En una comprobación adicional sobre la compilación de producción se verifican Última búsqueda a 390 px, los dos totales fuera de las barras, el histórico de Madrid y el anexo del score.

En navegador se revisan las 23 escenas y seis rutas en escritorio y móvil: 35 comprobaciones sin errores de ejecución ni desbordamientos horizontales. Las capturas de la demo usan el código actual, anuncios sintéticos, favoritos vacíos simulados y un trayecto aproximado identificado. No acreditan una consulta a Idealista ni una escritura en Supabase.

La migración `supabase/migrations/20260910120000_five_daily_recommendations.sql` se aplicó el 10 de septiembre a producción (`ggahjicfmsbpyhequpck`) antes de publicar. Se verificaron ambos límites de cinco y los permisos restringidos a `service_role`. La publicación se realiza mediante la integración GitHub/Vercel de la rama `main`. No se modifican las métricas ni los artefactos de entrenamiento.
