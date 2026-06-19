# Agente Inmobiliario — IA conversacional para el mercado español

Aplicación web conversacional que actúa como agente inmobiliario para el
mercado español. El usuario habla en lenguaje natural con un agente
construido sobre `claude-opus-4-6`. Cuando lo necesita, el agente llama
herramientas conectadas a la API de Idealista para buscar propiedades,
abrir la ficha de un anuncio y calcular hipotecas. Las conversaciones y
favoritos se persisten en Supabase.

```
Next.js 14 (App Router, RSC + SSE)
Anthropic SDK · streaming · tool-use multi-turn
Idealista API · OAuth2 client_credentials
Supabase · conversaciones, favoritos, eventos
Tailwind 3 · sistema editorial-noir mediterráneo
```

## Arranque local

```bash
npm install
cp .env.example .env.local   # ya está creado vacío en el repo
# Rellena las claves o deja MOCK_IDEALISTA=true para iterar sin la API real
npm run dev
```

`http://localhost:3000` — la home es la propia conversación. Si dejas
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
  api/conversations/route.ts # listar e ir a conversación concreta
  api/favorites/route.ts     # GET / POST / DELETE
  layout.tsx page.tsx globals.css
lib/
  agent/
    system-prompt.ts loop.ts tools.ts
    tools/{buscar-propiedades, detalle-propiedad, calcular-hipoteca}.ts
  idealista/
    auth.ts search.ts property.ts mock.ts
  supabase/
    client.ts server.ts conversations.ts favorites.ts
  errors.ts rate-limit.ts analytics.ts utils.ts
components/
  ChatInterface.tsx Sidebar.tsx Composer.tsx
  MessageBubble.tsx PropertyCard.tsx PropertyGrid.tsx
  MortgageCard.tsx TypingIndicator.tsx EmptyState.tsx
  FavoritesList.tsx ui/Logo.tsx
hooks/
  useChat.ts useFavorites.ts
types/index.ts
supabase/schema.sql
vercel.json
```

## Diseño

Editorial-noir mediterráneo. Off-black tintado en cálido, **un único**
acento ámbar/saffron (sin lila/cyan AI-slop), tipografía editorial:
Fraunces para display, DM Sans para UI, DM Mono para datos. Las
propiedades se presentan como spreads de revista con un *feature*
grande seguido de bloques compactos en bento asimétrico, no como tres
tarjetas iguales en horizontal. Layouts asimétricos también en la
home: hero más ancho que la columna de chips, tres pasos numerados con
el `00 01 02` en mono.

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
