# Revisión técnica de aplicación HabitIA — 8 septiembre 2026

Revisión de código del frontend, rutas API, agente, conectores, persistencia, motor financiero y contrato con modelo. No se modificó código funcional. Se añadieron únicamente estos documentos y el harness `app_checks.cjs`. Las pruebas no llaman Anthropic, Idealista ni servicios externos y no usan credenciales. El examen no sustituye un pentest ni demuestra el estado de políticas ya aplicadas manualmente a la base de datos.

## Verificación ejecutada

- `npm run lint`: sin advertencias ni errores.
- `npx tsc --noEmit --incremental false`: correcto.
- `npm run build`: compiló en checkout compartido, pero falló después por módulo `/_document` ausente. Repetición en copia temporal limpia, sin `.env`, sin `.next` previo y con claves vacías: **correcta**, 20 páginas generadas. El fallo inicial no es reproducible en limpio, no debe presentarse como bug confirmado del proyecto.
- `node docs/auditoria_2026-09-08/app_checks.cjs`: reproducciones aisladas; resultado guardado en `app_checks_resultados.json`. El harness bloquea red y simula dependencias de la persistencia; no es una suite completa de regresión.
- No existe comando `test` ni suite automatizada del producto en `package.json`; `scripts/test-idealista.mjs` requiere proveedor real, no se ejecutó.
- No se validó el aspecto visual ni accesibilidad mediante navegador desde este subanálisis. Sí hay buenas bases de código: focus trap/restauración de foco en ficha, etiquetas ARIA, estados vacíos y `prefers-reduced-motion`.

## P0 — Separar usuarios antes de abrir la demo al público

**Conversaciones accesibles sin autenticación ni comprobación de dueño.** `app/api/conversations/route.ts:7` acepta `userId` e `id` del visitante; `lib/supabase/conversations.ts:60` usa cliente `service_role`, solo filtra si se aportó un userId; sin él devuelve las últimas 20 conversaciones globales. `getConversationMessages`, línea 82, solo filtra por conversation_id. La propia UI `components/ChatInterface.tsx:38` consulta la lista global. Los identificadores de conversación se obtienen con esa lista, no hace falta adivinarlos. El harness confirma una consulta de listado sin filtro de usuario y lectura de mensajes solo por id.

**Favoritos compartidos y userId suplantable.** `lib/supabase/favorites.ts:11`, `:22`, `:37` asigna a todos los visitantes sin userId el mismo literal `anon`; `Dashboard.tsx:73` y `ChatInterface.tsx:20` llaman useFavorites sin usuario. Se mezclan favoritos y un visitante puede borrar los del grupo anónimo. Además cualquier cliente puede indicar otro userId en las rutas GET/POST/DELETE. Matiz: DELETE sin userId NO borra todos los usuarios, solo la fila `anon` del propertyCode; la posibilidad de suplantar userId sigue existiendo.

**Schema sin RLS.** `supabase/schema.sql` no activa Row Level Security ni define policies en ninguna tabla. Las credenciales de servicio permanecen en servidor correctamente (`server-only`), pero eso no sustituye autorización de endpoints. Comprobar si el despliegue aplicó RLS manualmente; aun así `service_role` evita esas políticas en las rutas descritas.

Acción mínima para TFM: sesión anónima firmada por servidor y ownership comprobado en cada acceso, o mantener favoritos/conversaciones exclusivamente en localStorage para la demo. Si se usa Supabase Auth, identificar usuario desde sesión verificable, usar RLS y no confiar en userId del body. El historial enviado al LLM y perfil (dirección de trabajo, nombre, presupuesto) también necesitan explicación clara de tratamiento/retención; no se encontró flujo de información de privacidad en el producto.

## P1 — Integridad de resultados y continuidad de demo

### 1. El chat pierde la identidad de la conversación persistida

`app/api/chat/route.ts:85-89` genera y envía UUID provisional. Después de cerrar el stream (`:116-118`) llama persistTurn con conversationId undefined en primer turno (`:126`); `lib/supabase/conversations.ts:23-29` crea un UUID diferente en Supabase. El nuevo id solo se asigna en variable local (`route.ts:137`), no llega al navegador. El siguiente turno usa el provisional y la inserción de mensajes puede fallar por FK. Además persistencia se ejecuta como promesa sin esperar después de respuesta, frágil en serverless; los mensajes solo guardan contenido/toolCalls, no todas las tarjetas de propiedades/mercado que la UI esperaba reconstruir. Corregir creando id definitivo antes de SSE y persistiendo con ese id; asegurar la tarea de escritura con mecanismo soportado por plataforma o await.

### 2. Una referencia local puede etiquetarse como dato oficial en vivo

`lib/market/cache.ts:60-66` retorna `fromFallback:false` para cualquier fila existente de Supabase. `refreshMarketData`, líneas 133-159, persiste incluso fixtures devueltos por fetchers que capturan error; no guarda procedencia ni fecha real de observación. `app/datos/page.tsx:55`, `:74`, `:89` traduce eso en etiqueta REAL. Harness: fixture cuyo campo fuente dice explícitamente “datos de respaldo” vuelve con fromFallback false. Guardar `source_kind`, `observed_at`, `fetched_at`, `period`, `fetch_status`; no sobrescribir último dato real con respaldo cuando falla proveedor. No usar fecha de caché como antigüedad del dato.

### 3. El modelo del TFM solo participa en el panel, no en valoraciones del chat

`lib/enrich.ts:45` llama valorarLote; `lib/agent/tools.ts:259` despacha herramientas sin ninguna valoración ML de compra. `analizar_mercado` utiliza media provincial y `valorar_alquiler` referencias manuales. Ante la misma vivienda el panel y chat pueden dar conclusiones distintas, y el alumno puede enseñar accidentalmente la heurística creyendo demostrar el modelo. Añadir tool única `valorar_vivienda` con misma función/contrato que panel y enviar al chat fuente, versión, ámbito, nivel de precios, intervalo, estado del servicio. Si ML falla, la UI debe decir claramente “modelo no disponible; comparación provincial de respaldo”.

### 4. Cuotas observadas, pero no controladas

`lib/idealista/search.ts:195-202`: cada búsqueda llama API con no-store, después registra consumo. `lib/idealista/usage.ts:14`, `:39`, `:90` calculan límite/aviso pero nunca lo comprueban antes de consumir. No hay reserva atómica ni caché persistente de búsqueda. 100 consultas/mes como límite configurado equivale a unas 3 al día; abrir o actualizar perfil puede relanzar búsqueda del panel y las tools del chat pueden consumir más de una por turno.

`lib/agent/loop.ts:15-16`, `:51-64`: default Opus, hasta 6 rondas y 4096 tokens de salida por ronda (techo teórico 24.576 tokens de salida en un turno, más entradas e historial). No registra usage/tokens, no hay presupuesto de gasto/usuario/día, truncado del historial ni límite de número de herramientas por ronda. Narración llama Sonnet para cada recomendación (`ai-insights.ts:15`, `:47`) aunque existe texto determinista de respaldo. Rate limit en memoria (`rate-limit.ts:15`) se reinicia/cambia entre instancias y solo cubre algunas rutas.

Acción: caché con TTL y claves de filtros normalizados, reserva de cuota atómica, cupo global de demo, contador tokens y gasto, opción `LLM_ENABLED=false`/narración determinista. Usar modelo barato probado para chat; no cambiarlo sin evaluar herramientas y fidelidad. La mejor reducción de coste para un mes proviene de evitar llamadas repetidas y limitar uso, además del hosting.

### 5. API de valoración expuesta como proxy de cómputo sin cap

`app/api/valoracion/route.ts:20-25` no tiene auth, rate limit ni límite de lote. Cualquier cliente puede usar el proxy que añade el bearer del servicio; permite despertar máquina repetidamente. Hay cap de 24 en /api/enrich pero no aquí. Añadir schema estricto, body limitado, máximo de anuncios, tiempo total, rate limit común y autenticación de demo si la API no es pública.

### 6. Calculadora recomienda el ganador incorrecto cuando las curvas vuelven a cruzarse

`lib/finance/rent-vs-buy.ts:439-440` define ganador según si hubo primer cruce, no por diferencia de patrimonio al horizonte. Ejemplo reproducido: vivienda150.000€, alquiler700€/mes, capital200.000€, horizonte40años, revalorización2%, inversión4%, subida de alquiler0; equilibrio18,7años pero ventaja compra final=-22.364€ y el texto afirma “COMPRAR te deja22.364€ más”. Decidir ganador con patrimonio final; mostrar todos los cruces o primer cruce sostenible, evitando afirmar “después siempre gana comprar”.

### 7. Vivienda habitual activa una exención fiscal sin comprobar las condiciones que la propia UI declara

`lib/finance/rent-vs-buy.ts:122` describe reinversión o edad como condición; `:258` usa solamente `const exenta=in_.viviendaHabitual`. Default es true. Bajo defaults supone20.070€ reales adicionales de patrimonio de compra frente al mismo caso sin exención. Hacer explícitos supuestos y separar residencia habitual de condición de exención; revisar reglas vigentes contra AEAT antes de asesorar. Esta revisión demuestra discrepancia del código, no emite dictamen tributario.

## P2 — Calidad científica, geografía, resiliencia

- **Seguridad/calidad de vida manuales y usadas para ranking.** `lib/neighborhood/fixtures.ts:26` son puntuaciones y tasas de criminalidad escritas a mano sin tabla trazable, periodo o fórmula por barrio. `report.ts:9` cita Interior; `recommend.ts:133-157` usa estas cifras en ranking y `:269` produce “barrio seguro (82/100)”. Aunque tarjetas indican orientativo, una etiqueta no valida evidencia ni tasas exactas. Para defensa retirar seguridad del score o usar indicadores trazables con metodología explícita y limitaciones; separar estrictamente capa ilustrativa del experimento ML.
- **Barrios homónimos se confunden.** `neighborhood/report.ts:24-31` ignora municipio/provincia al buscar nombre; “Centro,Málaga” usa fixture de Centro Madrid. Zona vacía selecciona primer fixture Salamanca por `.includes('')`. Harness lo reproduce. Igual necesidad de clave geográfica oficial para alquiler/gazetteer. No usar substring no condicionado como resolución de territorio.
- **Ámbito del modelo gate débil.** `valoracion/client.ts:24`, `:37` usa `/madrid/i` sobre municipio/provincia; acepta “Rozas de Madrid, Las” y municipio ausente con provincia Madrid incluso coordenadas fuera. Validar dominio por límites geográficos/modelo; confirmar rechazo o abstención del servicio Python. `idealista/search.ts:154-174` descarta detailedType, y `aAnuncio`, client.ts:41-54, tampoco lo transmite aunque el contrato lo contempla: revisar si afecta a áticos/dúplex/chalets con agente ML.
- **Etiquetas erróneas al aplicar modelo.** `enrich.ts:107-116` reutiliza etiquetas de VALORACION_VENTA (`:130-136`) que dicen “precio medio de la provincia” cuando resultado procede del modelo individual. `:94` fuerza “media provincial (INE)” pese a proveedor MITMA. `PropertyDetailDrawer.tsx:240` afirma “9 de cada10 viviendas así” y `:281` hardcodea error8,8%; deberían venir del modelo/versionado y expresar cobertura marginal validada, no garantía condicional sobre cualquier vivienda/fecha.
- **Transporte público dibujado como carretera con falsa exactitud.** `commute/index.ts:37` usa driving-car para geometría de transporte público; `:183` marca aprox=false si obtuvo geometría. El tiempo sigue siendo heurística. MapPanel usa línea sólida cuando aprox=false. Mantener aprox=true y etiqueta por modo, o integrar proveedor real de transporte público.
- **Timeouts y cancelación incompletos.** Idealista auth/search, fetchers INE/BdE/MITMA y ORS no tienen AbortSignal/timeout; fallback solo aparece si petición falla, no si queda colgada. `enrich.ts:37-45` espera datos de mercado antes de modelo, añade latencia crítica. `ai-insights.ts:126` Promise.race deja llamada LLM viva después de timeout. Stop cliente en useChat no transmite señal a executeAgentLoop/Anthropic. Aplicar deadlines/cancelación reales y ejecutar dependencias independientes en paralelo.
- **Validación API solo TypeScript.** Casts `as` no verifican JSON. `app/api/chat/route.ts:55`, `:71` arrojan TypeError para body null o content numérico, reproducido. Revisar schema para todas las rutas/tools con límites finitos, enum, coordenadas, texto e historial; errores400 consistentes.
- **Imprescindibles son solo una puntuación.** `recommend.ts:203-235` no excluye incumplimientos; piso sin ascensor puede recomendarse aunque usuario lo marque imprescindible, y features desconocidas no quedan como “no comprobado” claramente. Definir filtros duros frente preferencias blandas; evaluar ranking con casos de usuario reales. Solo se comparan primeros8 anuncios, no todo el mercado (`:37`,`:74`), por lo que “los mejores” necesita ese ámbito.
- **Hipoteca con salario fijo.** `lib/agent/tools/calcular-hipoteca.ts` calcula esfuerzo usando referencia fija en vez de ingresos del usuario; UI declara salario referencia pero hay riesgo de interpretación personalizada. Mantenerlo como ejemplo o pedir ingreso explícito. Motor principal comprar/alquilar sí admite ingreso solo para avisos.
- **Rehidratación incompleta de conversación.** `persistTurn` guarda toolCalls pero no arrays de propiedades/tarjetas; `getConversationMessages` reconstruye texto/toolCalls solamente. Reabrir pierde contexto visual y herramientas del siguiente turno se envían a Claude solo como texto. Preservar estructura requerida y evitar duplicar llamadas pagadas para reconstruirla.
- **Sin pruebas del parser oficial.** INE/BdE/MITMA dependen de nombres y posiciones de columnas; por ejemplo INE formatea NombrePeriodo pero no cuenta con `Periodo` ni comprueba4 trimestres únicos. Añadir fixtures de respuesta real y pruebas de unidad, serie/frecuencia/periodo/unidad, sin depender de red en CI.

## Recomendación de secuencia dentro de la app

1. Aislar visitantes y reparar UUID/almacenamiento; desactivar compartición accidental.
2. Mostrar fuente/versionado/estado ML y retirar claims que mezclan respaldo con validación científica.
3. Integrar exactamente la misma valoración en panel y chat; preparar tres casos de defensa reproducibles sin gasto de APIs.
4. Límites reales de consumo, caché persistente y modo demo etiquetado; fallbacks que no cambien significado silenciosamente.
5. Corregir o retirar calculadora financiera de la demo principal hasta comprobar supuestos y veredicto.
6. Suite mínima de contratos/auth/fallback/finanzas y recorrido de UI: nuevo visitante → búsqueda → valoración → comparar fuente → favorito → recargar → segundo turno; medir latencia con modelo dormido y caído.

Fortalezas a conservar: separación clara entre agente/herramientas/proveedores; modelo Python desacoplado; valoración en lote con abort de10s; fallbacks que permiten continuar; tipos TS estrictos; home/panel bien estructurados; interfaz reconoce varios datos orientativos; el build limpio es reproducible. La prioridad para un TFM sólido es la correspondencia entre lo que se afirma, lo que realmente se calcula y lo que está empíricamente validado.
