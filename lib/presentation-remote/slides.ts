export const TOTAL_SECONDS = 10 * 60;

export interface SceneDefinition {
  kicker: string;
  title: string;
  target: number;
  note: string;
}

export const MAIN_SCENE_COUNT = 12;
export const DEMO_SCENE_INDEX = 9;
export const SCENES: SceneDefinition[] = [
  {
    "kicker": "Portada",
    "title": "HabitIA",
    "target": 10,
    "note": "Presenta el nombre, al equipo y la decisión que conecta HabitIA."
  },
  {
    "kicker": "Problema",
    "title": "Decidir vivienda pesa cada vez más",
    "target": 65,
    "note": "Fotocasa Research, Experiencia en alquiler en 2025: el 43% de los inquilinos efectivos necesitó más de dos meses para encontrar vivienda de alquiler. España; artículo del 12 de agosto de 2025. No es una media de tiempo ni un dato de compra. HabitIA busca reducir el esfuerzo; el ahorro todavía no se ha medido."
  },
  {
    "kicker": "Oportunidad",
    "title": "El hueco que exploramos",
    "target": 95,
    "note": "La revisión de funciones públicas identifica herramientas de búsqueda, valoración y comparación financiera. Nuestra hipótesis es integrarlas en un recorrido. No acredita exclusividad."
  },
  {
    "kicker": "Solución",
    "title": "Del flujo actual a HabitIA",
    "target": 145,
    "note": "Mostrar las dos secuencias. Acertar, fácil y rápido son objetivos que quedan por validar con usuarios."
  },
  {
    "kicker": "Propuesta de valor",
    "title": "Todo el recorrido en HabitIA",
    "target": 195,
    "note": "Compra y alquiler, top cinco, chatbot, automatización diaria y comparación de todo el patrimonio. Cinco es un máximo cuando existen candidatos compatibles."
  },
  {
    "kicker": "Metodología",
    "title": "Una técnica para cada paso",
    "target": 250,
    "note": "Seguir recogida, EDA, modelado, plataforma, despliegue, chat y automatización. El modelo de valoración es XGBoost, con 21 variables y métricas declaradas de validación cruzada y test de 2018. El paquete de inferencia no incluye particiones, tamaño de test ni el cuaderno de selección; la memoria remite al repositorio del modelo para documentar el entrenamiento. No atribuirle la evaluación agrupada ni los intervalos del LightGBM anterior. Las variables de barrio incluyen fuentes posteriores a 2018; no presentar este test como validación temporal externa. El servicio Python y la web intercambian datos mediante la API 3.3.0."
  },
  {
    "kicker": "Motor de decisión",
    "title": "Filtrar calcular y ordenar",
    "target": 305,
    "note": "El diseño del Score combina Fair, Opportunity, Zone y Lifestyle con los pesos elegidos por el usuario. El predictor XGBoost v3 devuelve precio y desviación sin bandas calibradas. El código actual calcula Fair con una escala lineal provisional de la desviación. Opportunity compara la misma variación anual de oferta de venta del distrito frente a Madrid en compra y alquiler. Zone promedia cuatro indicadores disponibles con un peso del 25% cada uno. Con todos los componentes calculables, la cobertura es 100%; los pesos ausentes no se redistribuyen. La propuesta v12 del anexo plantea transformar las brechas en percentiles, todavía sin implementar. Los indicadores del modelo de precio no equivalen a un Zone Score calculado."
  },
  {
    "kicker": "Modelo de pricing",
    "title": "El verdadero valor del inmueble según sus características",
    "target": 360,
    "note": "Modelo de valoración: arboles_desplegable_ajustado, XGBoost, paquete v3. 21 variables, 410 árboles, profundidad máxima 12. La predicción base es exp(predicción logarítmica) por 1,0167794824519134, corrección de Duan. Estima precios anunciados de 2018; no precios de cierre ni un valor verdadero. MdAPE 9,2990% y error absoluto mediano (MdAE) de 23.708,48 euros declarados en su test de 2018. No comparar directamente estas cifras con las del experimento anterior: el paquete de inferencia no incluye las particiones ni el tamaño del test para comprobar que ambos experimentos se evaluaron en las mismas condiciones. El titular expresa el objetivo del producto; el resultado sigue siendo una estimación. La entrega habitia_predictor incorpora un escenario proyectado a 2026; las últimas fuentes observadas son venta de 2025 y alquiler de 2024. Los 410 árboles no cambian; se actualizan los índices y el alquiler relativo de barrio. El factor de venta es distrital y no debe confundirse con el IPV autonómico. Año objetivo y año observado son distintos; esta proyección no valida la precisión en anuncios de 2026. El paquete implementado funciona así: venta: multiplica la estimación base por indice_venta del distrito proyectado a 2026; no aplicar el factor heredado 1,5534 ni el IPV autonómico de 2026. Alquiler: multiplica el precio indexado por factor_renta_mensual del distrito proyectado a 2026; el factor ya es mensual y no se divide de nuevo entre 12. Esa mensualidad es un escenario derivado sin validación independiente de alquiler. No hay intervalos ni SHAP exportados, y el ajuste de nivel no demuestra precisión actual."
  },
  {
    "kicker": "Comprar vs. alquilar",
    "title": "Compara todo el patrimonio",
    "target": 415,
    "note": "Contrastar enfoque básico cuota/renta con capital, cartera, gastos y fiscalidad. Otras herramientas pueden incluirlos también. Mismo capital y rentabilidad supuesta en ambas opciones."
  },
  {
    "kicker": "Demo",
    "title": "La plataforma en acción",
    "target": 521,
    "note": "Vídeo de 106 segundos con música continua de João y capturas con datos de ejemplo. Arranca al entrar; sus controles permiten pausar, buscar y ampliar. Al regresar conserva el punto alcanzado. Revisión v9: resultados, ficha, desglose y metodología actualizados entre 68 y 94 segundos. Capturas de la aplicación en una instancia aislada con la respuesta de valoración XGBoost y ruta OpenRouteService guardada en v8. Vivienda ficticia de compra en Centro: Fair 100, Opportunity 52,8, Zone 50,6 y Lifestyle 86,7; HabitIA Score 73 y cobertura del 100%. Zone utiliza cuatro indicadores al 25%. La ruta de bici contiene 163 coordenadas y dura 17 minutos. Opportunity utiliza el mismo indicador de venta en compra y alquiler. De 94 a 106 segundos, el gráfico completo compara 18 años con equilibrio a los 9,8; patrimonio final de compra 338.318 euros y alquiler 292.153 euros de hoy. Son los supuestos editables de ejemplo; solo se amplía el horizonte a 18 años para centrar el cruce en el vídeo. Las escalas lineales actuales no son los percentiles propuestos en el anexo. No utilizar el vídeo como prueba de resultados del modelo XGBoost."
  },
  {
    "kicker": "Roadmap",
    "title": "Demostrar validar y escalar",
    "target": 551,
    "note": "Hasta cinco viviendas diarias. El modelo de valoración ya está disponible y el código integra la API del predictor XGBoost v3. Verificar el despliegue y la conexión, y validar utilidad con usuarios reales y precisión con datos actuales. Futuro: revalorización, visita 2D a 3D, más ciudades, B2C y B2B."
  },
  {
    "kicker": "Cierre",
    "title": "La herramienta que echábamos en falta",
    "target": 561,
    "note": "HabitIA. La herramienta que echábamos en falta. Acierta, fácil, rápido."
  },
  {
    "kicker": "Anexo · HabitIA Score",
    "title": "Desglose del cálculo del HabitIA Score",
    "target": 561,
    "note": "Diseño v12 pendiente de implementación. Fair y Opportunity proponen percentiles de las brechas respecto a una distribución de referencia por fijar, independiente de la evaluación final. No usar el test reservado para diseñar el Score. Zone requiere indicadores entre 0 y 1, con orientación y ausencias resueltas; las variables de barrio de XGBoost no lo implementan por sí mismas. Lifestyle usa el negativo de los minutos y las viviendas filtradas como referencia; resolver empates y el caso de una vivienda. El código actual usa escalas lineales provisionales para Fair y Opportunity; no implementa los percentiles v12. Fair compara importes del anuncio y del modelo. Opportunity utiliza la misma variación anual de oferta de venta del distrito frente a Madrid en compra y alquiler. Zone promedia cuatro indicadores al 25%. Lifestyle mantiene la función por minutos. La cobertura alcanza el 100% cuando todos los componentes tienen datos; no se redistribuyen pesos ausentes."
  },
  {
    "kicker": "Anexo · Arquitectura",
    "title": "Arquitectura del producto",
    "target": 561,
    "note": "La web y el backend Next.js están planteados en Vercel; el servicio Python/FastAPI en Fly.io; PostgreSQL y automatizaciones en Supabase; Claude mediante Anthropic. Panel y chat usan herramientas compartidas. La API de XGBoost v3 conecta la web con el servicio: carga el predictor una vez, prepara 21 variables y devuelve precio base de 2018, precio de venta indexado y renta derivada con sus periodos explícitos; ambos se proyectan a 2026 con últimas fuentes de venta de 2025 y alquiler de 2024, conservando las advertencias por anuncio. No entrena durante la búsqueda, no exporta intervalos ni SHAP. La aplicación deriva Fair de sus importes mediante una escala provisional. Si el nuevo modelo se abstiene, Fair queda ausente y baja la cobertura del score global; no se redistribuyen los pesos. Las estimaciones antiguas no alimentan el Fair vigente. El adaptador 3.3 admite venta y alquiler; el paquete original del predictor admite anuncios de venta. Claude interpreta y explica los resultados. La incorporación en código no sustituye a comprobar la conexión del despliegue. Historial y favoritos de la demo son compartidos; el perfil vive en el navegador y las notificaciones se identifican con su cookie."
  },
  {
    "kicker": "Anexo · Modelo de valoración",
    "title": "XGBoost en detalle",
    "target": 561,
    "note": "Fuente: metadatos.json del paquete arboles_desplegable_ajustado v3. Se conserva una copia exacta en predictor-metadata.json. Test de 2018: error porcentual mediano 9,2990450726%; error absoluto mediano 23.708,4844 euros; MAE 49.220,1987 euros; RMSE log 0,1856103494; R² log 0,9398942152; 80,5551874917% con error dentro de ±20%. Ese 80,56% es una proporción observada: no un intervalo de predicción ni probabilidad individual de acierto. RMSE y R² están en escala logarítmica. Los metadatos también declaran RMSE log de validación cruzada 0,1857717187. El paquete de inferencia no incorpora particiones, tamaño del test ni cuaderno de selección; la memoria remite al repositorio del modelo para documentar el entrenamiento. La integración web no repite esa evaluación. 21 variables: 4 de tamaño/distribución/planta, 11 de equipamiento/tipología, 3 distancias y 3 del barrio. El top 5 de la diapositiva de pricing se ha calculado sobre los 410 árboles exportados por ganancia media de cada variable: superficie, baños, alquiler mediano del barrio, índice de vulnerabilidad y ascensor. No son atribuciones SHAP ni efectos causales. El dominio de producción descarta viviendas mayores de 367 m², casas/chalets y descripciones de viviendas a reformar u ocupadas/alquiladas. La obra nueva conserva la estimación con advertencia; los anuncios de una promoción no son observaciones independientes. El histórico de entrenamiento registra superficies mayores: las métricas entregadas no detallan el resultado del subconjunto admitido en producción. El modelo omite conservación, condición de ático y vistas; parte del equipamiento depende de lo que describa el anuncio. Fuentes de barrio posteriores a 2018 limitan la lectura temporal. Índices de venta y alquiler y variable relativa de alquiler de barrio proyectados a 2026, con últimas fuentes de venta de 2025 y alquiler de 2024. Entrenamiento y métricas siguen correspondiendo a 2018; alquiler sin validación propia. No afirmar superioridad frente a LightGBM sin una comparación común."
  }
];

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
