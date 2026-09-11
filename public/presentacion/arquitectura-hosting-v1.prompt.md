# Infografía de arquitectura

Generada con la herramienta integrada imagegen. Archivo final: arquitectura-hosting-v1.png.
Infraestructura contrastada con vercel.json, la configuración pg_cron de Supabase, la documentación de despliegue y /salud del servicio Fly.io (modelo 2.0.0, 25 variables).

## Prompt inicial

Use case: infographic-diagram.
Create a polished Spanish-language architecture infographic for HabitIA, a housing decision web app. Landscape 16:9, ideally 2560x1440 or higher. Warm ivory #F7F6EF background, dark forest-green #17211D type, muted green accents. Clean editorial typography, generous whitespace, crisp legible labels, restrained thin arrows and elegant cards. No photorealism, no decorative server clutter. Use recognizable brand logos next to the wordmarks Vercel (black triangle), Fly.io (purple wing), Supabase (green bolt), Anthropic (wordmark), Idealista (wordmark); logos represent integrations, no sponsorship claim.
Title exact: "HabitIA · del usuario a los servicios".
Four clearly organized levels:
Top: friendly user with phone/laptop icon, label "Usuario"; four small action chips "Buscar vivienda", "Conversar", "Comprar o alquilar", "Guardar y recibir avisos".
Arrow labelled "Navegador" to main central large rounded container labeled "Vercel" and "Web + backend · Next.js". Within it small phrases "Panel · chat · mapa · comparador" and "Coordina herramientas y calcula el Score". Bidirectional arrow between user and this container; return arrow label "Viviendas, estimaciones y explicaciones".
Below, three equal prominent separate service cards connected bidirectionally ONLY to Vercel, never directly to each other:
Left "Fly.io" / "Modelo de precio" / "Python · FastAPI · LightGBM" / "25 variables → precio e intervalo". Small accent label "Venta · modelo entrenado".
Middle "Supabase" / "PostgreSQL" / "Favoritos · historial · suscripciones" / "Cachés y selección diaria".
Right "Anthropic" / "Claude" / "Interpreta preguntas y explica" / "Llama herramientas del backend".
Bottom a visually secondary horizontal strip connected to Vercel by a clearly routed slim side line, label "Fuentes externas", containing "Idealista · anuncios", "OpenRouteService · trayectos", "Fuentes oficiales · contexto".
Footer exact "Fair: anuncio frente a estimación · Lifestyle: tiempo al trabajo · Opportunity y Zone: pendientes".
Make hosting boundaries visually unmistakable: Vercel hosts app/backend, Fly.io hosts price model, Supabase stores data, Anthropic supplies external AI. Model is already trained and does not train per query. No model inside Vercel or Supabase. Do not draw flows suggesting that Claude estimates prices. All arrows must attach to correct boxes; no overlapping text. All requested text must be spelled exactly, very readable; no extra fine print or invented claims.

## Edición final

Edit this architecture infographic. Preserve all service cards, their text, logos, positions, connections, background, footer and user action chips. Correct only the top connection: the left arrow beside 'Navegador' must point DOWN from Usuario to Vercel, and the right arrow beside 'Viviendas, estimaciones y explicaciones' must point UP from Vercel to Usuario. Also remove the extraneous decorative side slogans (DATOS QUE TE ACERCAN A CASA, Buscar Comparar Entender Decidir, MEJORES DECISIONES PARA TU PRÓXIMA VIVIENDA, UN LUGAR PARA TU SIGUIENTE CAPÍTULO) and the duplicate upper-left HabitIA logo; leave this side space clean ivory. Keep the large title at top. Do not add any new words.
