# Cómo funciona HabitIA

> HabitIA evita los filtros interminables: le cuentas cómo quieres vivir y te
> devuelve los pisos que mejor encajan, sobre un mapa, con el
> porqué de cada uno. Este documento explica el flujo, la arquitectura y de
> dónde salen los datos. La versión interactiva vive en `/como-funciona`.

## El problema

Buscar piso en los portales es un trabajo manual: filtras por zona y precio, y
luego tú solo cruzas a mano si el barrio es seguro, si el precio está bien y
cuánto tardarías al trabajo. Nuestra apuesta es invertirlo: que el usuario
explique su vida una vez y que el agente haga ese cruce por él, y lo presente
sobre un mapa en vez de en una hoja de cálculo.

## El flujo, en cuatro pasos

1. **Onboarding en el mapa.** Eliges la zona y tu lugar de trabajo pinchando o
   arrastrando un pin sobre un mapa (con buscador), tu presupuesto, con quién
   vives, si tienes mascota y qué te importa de un barrio (seguridad, transporte,
   zonas verdes, vida nocturna, tranquilidad) y los imprescindibles del piso
   (ascensor, exterior, terraza, garaje…). El perfil se guarda en el navegador.

2. **Recomendación «para ti».** Pedimos varios candidatos a Idealista con tu
   perfil y puntuamos cada uno de 0 a 100 combinando precio frente a la zona,
   ajuste a tu presupuesto, trayecto, seguridad, calidad de vida e
   imprescindibles. Tus prioridades suben el peso de lo que más te importa.

3. **Enriquecimiento.** A cada piso le calculamos tres señales: si está caro o
   barato para la zona, la seguridad/calidad de vida del barrio y el tiempo y la
   ruta real desde tu trabajo.

4. **Mapa + explicación.** Te enseñamos los 3-5 mejores sobre el mapa
   (pines coloreados por precio, halo de seguridad y el trayecto dibujado) y un
   modelo de lenguaje redacta una frase de «por qué encaja contigo» usando solo
   esos datos. Puedes abrir la ficha completa de cualquiera (fotos, descripción,
   hipoteca estimada en compra, etc.).

## El motor de recomendación

El ranking es determinista y explicable. Cada componente puntúa 0-1 y se pondera:

- **precio** frente a la referencia de la zona (barato → caro),
- **presupuesto** (ajuste y holgura),
- **trayecto** (menos minutos, mejor; pesa más si marcaste «cerca del trabajo»),
- **seguridad** (índice del barrio; pesa más si marcaste «seguridad»),
- **calidad de vida** (transporte, verde, servicios, tranquilidad según tus
  prioridades),
- **imprescindibles** (ascensor → ascensor, exterior → exterior, etc.).

Sobre ese ranking, una llamada a Claude (modelo rápido) redacta el intro y el
porqué de cada piso. Si no hay clave o falla, se usa una explicación generada por
plantilla con los mismos datos: nunca se inventa nada.

## De dónde salen los datos

| Fuente | Qué aporta | Tipo | Actualización |
| --- | --- | --- | --- |
| Idealista | Anuncios (pisos, fotos, precio, m²) | Infra | Al buscar (mock hasta tener clave propia) |
| MITMA — Valor Tasado | Precio €/m² de compra por provincia | **Real** | Trimestral (cron) |
| INE — IPV (tabla 25171) | Tendencia de precios (%) | **Real** | Trimestral |
| Banco de España | Tipo hipotecario medio + Euríbor 12m | **Real** | Mensual |
| OpenRouteService | Rutas y tiempos de trayecto | **Real** | En vivo (con `ORS_API_KEY`) |
| Nominatim (OSM) | Geocodificación del mapa | **Real** | En vivo |
| SERPAVI — MIVAU | Alquiler €/m²/mes por zona | Orientativo | Snapshot (el portal bloquea descargas automáticas) |
| Min. del Interior | Criminalidad / seguridad por barrio | Orientativo | Snapshot (datos curados) |
| Supabase | Conversaciones, favoritos y caché de mercado | Infra | Persistencia |

Transparencia: los indicadores de seguridad y las referencias de alquiler son
orientativos (no oficiales en vivo a nivel de barrio) y el agente lo advierte en
sus tarjetas. El €/m² de compra, el IPV y los tipos hipotecarios sí son fuentes
oficiales en vivo.

## La arquitectura

```
Navegador · Next.js + React (panel, mapa MapLibre)
        │  perfil + filtros
        ▼
/api/recommend → lib/recommend  (buscar · puntuar · narrar)
        ├── Idealista (búsqueda)
        ├── lib/enrich → market (precio) · commute (trayecto) · neighborhood (barrio)
        └── lib/ai-insights → Claude (Sonnet)
        │  lee referencias de mercado
        ▼
Caché de mercado · Supabase  (+ fallback en memoria / fixtures)
        ▲  refresco trimestral
        │
/api/cron/market → MITMA · INE · Banco de España
```

**Stack:** Next.js 14 (App Router, SSR + SSE), Claude (Opus para el chat, Sonnet
para los insights), MapLibre GL + teselas CARTO (sin clave), Supabase (Postgres),
OpenRouteService, e INE/MITMA/Banco de España para el mercado.

## Rutas principales

- `/` — portada
- `/dashboard` — onboarding + panel «para ti» con mapa
- `/como-funciona` — esta explicación
- `/chat` — conversación con HabitIA (opcional)
- `/api/recommend`, `/api/enrich`, `/api/property`, `/api/geocode`,
  `/api/chat`, `/api/cron/market`
