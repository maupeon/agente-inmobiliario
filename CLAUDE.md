# HabitIA — encuentra piso para alquilar o comprar

Aplicación web conversacional. El usuario cuenta en lenguaje natural qué vivienda
quiere alquilar o comprar y HabitIA usa herramientas conectadas a Idealista para
buscar propiedades, mostrar el detalle de un anuncio y calcular hipotecas. Las
conversaciones y favoritos se guardan en el navegador para esta demo sin autenticación.

El nombre del producto es **HabitIA** y debe escribirse siempre con `H` e `IA` en
mayúsculas. El nombre une hogar e inteligencia artificial sin recurrir a siglas
alternativas. Ver `components/ui/Logo.tsx` para sus variantes `stack`, `inline`
y `mark`.

## Arquitectura

- `app/` — rutas Next.js (App Router)
- `app/api/chat/route.ts` — endpoint principal del agente con SSE streaming
- `lib/idealista/` — wrappers de la API REST de Idealista (auth OAuth2 + búsqueda + detalle)
- `lib/agent/` — system prompt, definición de tools, loop de tool-use
- `lib/agent/tools/` — implementación de cada tool (un archivo por tool)
- `lib/supabase/` — cliente de servidor para caché y cuota; queries antiguas de conversaciones/favoritos fuera del recorrido activo
- `lib/local-conversations.ts` — historial local con tarjetas, sin acceso a conversaciones de otros visitantes
- `lib/errors.ts` — clases de error tipadas y `handleError()` para mensajes amigables
- `lib/analytics.ts` — `trackEvent()` para la tabla `events`
- `components/` — componentes React (Chat, PropertyCard, Sidebar, etc.)
- `hooks/` — hooks de cliente (`useFavorites`, `useChat`), persistencia local sin sincronización remota
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

HabitIA sigue un sistema cálido y sereno inspirado en las interfaces de Apple:
jerarquía muy clara, controles de al menos 44 px, tipografía Geist, verde
botánico como acento, superficies translúcidas con profundidad contenida y
movimiento físico breve que respeta `prefers-reduced-motion`. La búsqueda debe
ser accesible desde el primer viewport y la personalización es progresiva y
opcional. Ver `app/globals.css` y `tailwind.config.ts` para los tokens.
