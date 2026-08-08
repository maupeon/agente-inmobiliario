# HabitIA — encuentra piso para alquilar o comprar

HabitIA es una aplicación web para encontrar vivienda en el mercado español.
El usuario explica en lenguaje natural qué quiere alquilar o comprar. Un agente
construido sobre `claude-opus-4-6` llama, cuando lo necesita, a
herramientas conectadas a la API de Idealista para buscar propiedades,
abrir la ficha de un anuncio y calcular hipotecas. Las conversaciones y
favoritos se persisten en Supabase.

```
Next.js 14 (App Router, RSC + SSE)
Anthropic SDK · streaming · tool-use multi-turn
Idealista API · OAuth2 client_credentials
Supabase · conversaciones, favoritos, eventos
Tailwind 3 · sistema de diseño HabitIA
```

## Arranque local

```bash
npm install
cp .env.example .env.local   # ya está creado vacío en el repo
# Rellena las claves o deja MOCK_IDEALISTA=true para iterar sin la API real
npm run dev
```

`http://localhost:3000` — la home presenta el producto y lleva a `/dashboard`,
la experiencia principal: tras el onboarding, la pestaña **"Para ti"** busca en
Idealista con tu perfil y te enseña los **3-5 pisos que mejor encajan** sobre un
mapa, coloreados por precio frente a la zona, con halo de seguridad del barrio y
el trayecto desde tu trabajo a cada piso, cada uno con una explicación de por
qué encaja. El chat sigue disponible como opción secundaria ("Pregúntale a
HabitIA"). Si dejas
`MOCK_IDEALISTA=true` (por defecto en `.env.local`) las búsquedas
devuelven datos sintéticos coherentes generados en `lib/idealista/mock.ts`.

Aún así necesitas `ANTHROPIC_API_KEY` para que el agente responda. Si no
lo tienes, la UI sigue funcionando y verás un mensaje de error legible en
el primer turno.

## Variables de entorno

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | sí | Agente Claude. |
| `IDEALISTA_API_KEY` / `IDEALISTA_SECRET` | sí (en prod) | OAuth2 client_credentials. |
| `IDEALISTA_BASE_URL` | no | Por defecto `https://api.idealista.com/3.5/`. |
| `NEXT_PUBLIC_SUPABASE_URL` | recomendada | Persistencia. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | recomendada | Lecturas desde el cliente. |
| `SUPABASE_SERVICE_ROLE_KEY` | recomendada | Escrituras desde API routes. |
| `MOCK_IDEALISTA` | no | `true` evita llamar a Idealista y devuelve datos ficticios. |
| `ANTHROPIC_MODEL` | no | Permite forzar otro modelo (default `claude-opus-4-6`). |
| `NEXT_PUBLIC_SITE_URL` | recomendada en prod | URL pública usada en los metadatos sociales. |

Si Supabase no está configurado, los endpoints `/api/conversations` y
`/api/favorites` devuelven listas vacías; el chat sigue funcionando y los
favoritos viven en `localStorage`.

## Schema de la base de datos

Ejecuta `supabase/schema.sql` en el SQL editor de Supabase. Crea las
tablas `conversations`, `messages`, `favorites` y `events`, sus índices
y un trigger que actualiza `updated_at` en cada update.

## Estructura

```
app/
  api/chat/route.ts          # SSE streaming + rate limit + persistencia
  api/enrich/route.ts        # enriquecimiento por lote para el panel/mapa
  api/conversations/route.ts # listar e ir a conversación concreta
  api/favorites/route.ts     # GET / POST / DELETE
  api/geocode/route.ts api/cron/market/route.ts
  chat/page.tsx dashboard/page.tsx
  layout.tsx page.tsx globals.css
lib/
  agent/
    system-prompt.ts loop.ts tools.ts
    tools/{buscar-propiedades, detalle-propiedad, calcular-hipoteca,
           analizar-mercado, valorar-alquiler, calcular-trayecto, consultar-barrio}.ts
  idealista/   auth.ts search.ts property.ts mock.ts
  market/      ine.ts bde.ts rent.ts cache.ts fixtures.ts match-province.ts types.ts
  commute/     index.ts places.ts        # routing ORS + geometría del trayecto
  neighborhood/ report.ts fixtures.ts    # seguridad + calidad de vida
  supabase/    client.ts server.ts conversations.ts favorites.ts
  enrich.ts                  # valoración + trayecto + barrio por propiedad
  dashboard-format.ts last-search.ts
  errors.ts rate-limit.ts analytics.ts utils.ts
components/
  ChatInterface.tsx Sidebar.tsx Composer.tsx MessageBubble.tsx
  Property/Mortgage/Market/Rent/Commute/Neighborhood Card.tsx
  Dashboard.tsx MapPanel.tsx            # panel + mapa (maplibre, tiles CARTO)
  EmptyState.tsx FavoritesList.tsx ui/Logo.tsx
hooks/
  useChat.ts useFavorites.ts useProfile.ts
types/index.ts
supabase/schema.sql
vercel.json
```

## Diseño

Sistema cálido y sereno inspirado en las interfaces de Apple: jerarquía clara,
Geist para lectura y datos, verde botánico como acento, controles cómodos,
superficies translúcidas y profundidad contenida. La búsqueda principal aparece
en el primer viewport; el perfil se completa de forma progresiva y opcional.
Los resultados priorizan título, precio, características, motivo de encaje y
acciones, con cambio claro entre lista y mapa en móvil.

Tokens en `tailwind.config.ts` y `app/globals.css`.

## Rate limiting

`lib/rate-limit.ts` aplica un cap en memoria del worker:

- 10 requests / minuto por IP
- 50 requests / hora por IP

Para producción multi-region migrar a Upstash Redis (la interfaz pública
de `rateLimit(ip)` está pensada para que el cambio sea local).

## Analytics

`lib/analytics.ts → trackEvent()` inserta en la tabla `events`. Eventos:

- `conversation_started`
- `search_performed` — `{ zona, operacion, resultCount }`
- `property_favorited` — `{ propertyId, price, district }`
- `mortgage_calculated` — `{ price, monthlyPayment }`
- `tool_error` — `{ tool, reason }`

Sin PII. Si Supabase no está configurado se ignoran silenciosamente.

## Deploy

```bash
npm i -g vercel
vercel
```

Después en el dashboard de Vercel añade las variables de entorno
listadas arriba. `vercel.json` ya fija `maxDuration: 60s` para
`app/api/chat/route.ts` — necesario porque el loop con varias tool
calls puede tardar 20-40 segundos.

## Probar el agente sin UI

```bash
curl -N http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"id":"u1","role":"user","content":"Busco un piso en Chamberí por 400k","createdAt":"2026-05-08"}]}'
```

Devuelve eventos SSE: `text`, `tool_start`, `tool_end`, `properties`,
`mortgage`, `done`, `error`. El parser está en `hooks/useChat.ts`.

## Licencia

Privado. Idealista es marca registrada de Idealista S.A.U.; este
proyecto se conecta a su API pública con credenciales propias.
