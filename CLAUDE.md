# HabitIA — encuentra piso para alquilar o comprar

Aplicación web conversacional. El usuario cuenta en lenguaje natural qué vivienda
quiere alquilar o comprar y HabitIA usa herramientas conectadas a Idealista para
buscar propiedades, mostrar el detalle de un anuncio y calcular hipotecas. Las
conversaciones y favoritos se guardan en un espacio global compartido de Supabase
para esta demo sin autenticación. El perfil y la última búsqueda siguen en el
navegador. La bandeja de notificaciones es privada de cada navegador.

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
- `lib/supabase/` — cliente de servidor para caché, cuota e historial/favoritos compartidos de demo
- `lib/local-conversations.ts` — historial local con tarjetas, sin acceso a conversaciones de otros visitantes
- `lib/errors.ts` — clases de error tipadas y `handleError()` para mensajes amigables
- `lib/analytics.ts` — `trackEvent()` para la tabla `events`
- `components/` — componentes React (Chat, PropertyCard, Sidebar, etc.)
- `hooks/` — perfil local; historial y favoritos de demo sincronizados con Supabase
- `types/index.ts` — tipos TypeScript compartidos
- `supabase/schema.sql` — schema base; aplicar además las migraciones documentadas
- `lib/personal-score.ts` — pesos α/β/γ/δ enteros, suma100, cuatro componentes y cobertura de datos
- `lib/notifications/`, `app/api/notifications/`, `app/api/cron/recommendations/` — selección diaria privada de hasta3 viviendas; configuración en `docs/notificaciones.md`

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

## Revisión de producto del 9 de septiembre de 2026

Consultar `docs/respuestas-dudas-mauri-v3.md` antes de reinterpretar las decisiones.
No restaurar índices manuales de barrio ni atribuir referencias ilustrativas a fuentes
oficiales. Zone mide proximidad elegida; el score es una heurística de preferencias,
no una probabilidad. La calculadora compara desde hoy al mismo horizonte; la mudanza
solo genera avisos cualitativos. Guardar y activar Notificaciones es la autorización
para la búsqueda diaria; requiere migración y cron operativo. Cambiar los pesos o
restaurar Última búsqueda no debe lanzar consultas de Idealista.
