# Agente Inmobiliario — IA conversacional para el mercado español

Aplicación web conversacional. El usuario habla en lenguaje natural con un agente
construido sobre `claude-opus-4-6` que llama herramientas conectadas a Idealista
para buscar propiedades, obtener detalle de un anuncio y calcular hipotecas.
Las conversaciones se persisten en Supabase.

El nombre del producto es **Agente Inmobiliario**. Tipográficamente la **A** y la
**I** se renderizan en serif italic + saffron (variante editorial Newsreader),
mientras que el resto va en Geist sans → la doble lectura es "Agente
Inmobiliario" + el sigil "A · I" → "IA". Ver `components/ui/Logo.tsx` con sus
tres variantes (`stack`, `inline`, `mark`).

## Arquitectura

- `app/` — rutas Next.js (App Router)
- `app/api/chat/route.ts` — endpoint principal del agente con SSE streaming
- `lib/idealista/` — wrappers de la API REST de Idealista (auth OAuth2 + búsqueda + detalle)
- `lib/agent/` — system prompt, definición de tools, loop de tool-use
- `lib/agent/tools/` — implementación de cada tool (un archivo por tool)
- `lib/supabase/` — cliente Supabase y queries de conversaciones / favoritos
- `lib/errors.ts` — clases de error tipadas y `handleError()` para mensajes amigables
- `lib/analytics.ts` — `trackEvent()` para la tabla `events`
- `components/` — componentes React (Chat, PropertyCard, Sidebar, etc.)
- `hooks/` — hooks de cliente (`useFavorites`, `useChat`)
- `types/index.ts` — tipos TypeScript compartidos
- `supabase/schema.sql` — schema completo de la base de datos

## Convenciones

- TypeScript estricto. `any` solo cuando lo dicta la API externa.
- Componentes en `PascalCase`, utilidades en `camelCase`.
- Cada tool de Claude vive en su propio archivo en `lib/agent/tools/`.
  Exportan `{ name, run(input): Promise<result> }`.
- Errores de Idealista siempre se loggean con contexto y se devuelven al modelo
  como `tool_result` con `is_error: true` para que Claude lo comunique al usuario.
- Variables de entorno en `.env.example`. Nunca commitear `.env.local`.
- Modo `MOCK_IDEALISTA=true` para desarrollar sin claves reales (devuelve datos
  ficticios coherentes en `lib/idealista/mock.ts`).

## Modelo

`claude-opus-4-6` (200K contexto, streaming, tool use multi-turn).

## APIs externas

- **Idealista**: OAuth2 client-credentials, base `https://api.idealista.com/3.5/`.
  Ver `lib/idealista/auth.ts` (token cacheado en memoria con refresh automático).
- **Supabase**: cliente público en `lib/supabase/client.ts`, cliente de servicio
  (con `service_role`) en `lib/supabase/server.ts` para escrituras desde API routes.

## Diseño

Editorial-noir mediterráneo. Off-black tintado cálido (no `#000`), un único acento
ámbar/saffron, tipografía editorial (Fraunces serif display + DM Sans body +
DM Mono para precios). Layouts asimétricos tipo bento. Las propiedades se
presentan como spreads de revista, no grid genérico de tarjetas iguales.
Ver `app/globals.css` y `tailwind.config.ts` para tokens.
