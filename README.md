# HabitIA · Asistente inmobiliario

Aplicación web del **Trabajo Fin de Máster de Big Data, Data Science e Inteligencia Artificial de la Universidad Complutense de Madrid, curso 2025–2026**.

HabitIA reúne la búsqueda de vivienda, las preferencias personales, la comparación económica entre comprar y alquilar y un asistente conversacional. Permite explorar anuncios en un mapa y consultar su contexto, trayecto al trabajo y valoración cuando los servicios correspondientes están disponibles.

**Este repositorio contiene la aplicación web y sus API de servidor.** El entrenamiento, los datos originales y el servicio Python del modelo se entregan por separado con la memoria. Para conectarlo, consulta [Servicio de valoración](docs/modelo-externo.md).

[Aplicación publicada](https://habitiaucm.vercel.app) · [Presentación del TFM](https://habitiaucm.vercel.app/presentacion) · [Guía de configuración](docs/configuracion.md)

## 1. Arrancar en local

Necesitas **Node.js 22 y npm 10 o superior**, además de Git. No necesitas Python ni claves de proveedores para revisar la demo básica.

```bash
git clone https://github.com/maupeon/agente-inmobiliario.git
cd agente-inmobiliario

# Si utilizas nvm, selecciona la versión del proyecto:
nvm use

npm ci
cp .env.example .env.local
npm run dev
```

Si ya tienes `.env.local`, conserva su configuración; no vuelvas a copiar el ejemplo encima. Si no utilizas nvm, instala Node.js 22 y omite `nvm use`.

Abre **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)**. Configura un perfil de ejemplo, elige Madrid y pulsa **Buscar → Confirmar y buscar**. Verás anuncios sintéticos identificados como **Demo**. La calculadora está en [http://localhost:3000/comprar-o-alquilar](http://localhost:3000/comprar-o-alquilar).

El ejemplo desactiva Idealista real y Anthropic. Los mapas, la geocodificación y algunas fuentes públicas pueden necesitar internet: la demo no es completamente offline. El acceso al repositorio depende de los permisos que conceda el equipo.

## 2. Qué funciona en cada modo

| Función | Con la configuración de ejemplo | Para habilitar la integración |
| --- | --- | --- |
| Buscar y ordenar viviendas | Anuncios sintéticos, filtros y HabitIA Score | Claves de Idealista y cuota configurada en Supabase |
| Comprar frente a alquilar | Calculadora completa en el navegador | Ningún servicio adicional |
| Mapa y contexto de la zona | Recursos locales y fuentes públicas | Internet para las consultas externas |
| Trayecto al trabajo | Aproximación identificada | OpenRouteService para los modos compatibles |
| Chat con herramientas | Pausado | Clave de Anthropic y `LLM_ENABLED=true` |
| Valoración individual | Estado «Valoración no disponible» | Predictor XGBoost v3, contrato 3.3.0 e identidad de paquete vigente |
| Historial y favoritos | Persistencia no disponible; la interfaz avisa | Supabase y esquema de demo compartida |
| Selección diaria de hasta 5 viviendas | No disponible | Supabase, migraciones y cron |
| Presentación del TFM | Diapositivas, resultados y vídeo incluidos | Ningún backend del modelo para mostrar las cifras guardadas |

**Historial y favoritos son compartidos entre todos los visitantes de la demo.** Utiliza conversaciones de ejemplo. El perfil y la última búsqueda permanecen en el navegador; la bandeja de notificaciones tiene una identidad privada por navegador. No existe un sistema de cuentas de usuario.

## 3. Recorrido por la aplicación

| Ruta | Contenido |
| --- | --- |
| `/` | Presentación de HabitIA |
| `/dashboard` | Perfil, búsqueda, mapa, resultados y favoritos |
| `/chat` | Asistente conversacional |
| `/comprar-o-alquilar` | Comparación patrimonial de compra y alquiler |
| `/datos` | Fuentes, periodos y contexto territorial |
| `/como-funciona` | Explicación del sistema y del score |
| `/notificaciones` | Preferencias y bandeja de la selección diaria |
| `/presentacion` | Presentación interactiva del TFM; también admite `/presentación` |

## 4. Estructura del repositorio

```text
agente-inmobiliario/
├── app/                        # Páginas y API de Next.js App Router
│   ├── api/                    # Chat, búsqueda, valoración, persistencia y cron
│   └── presentacion/           # Diapositivas y resultados publicados del TFM
├── components/                 # Interfaz agrupada por función
│   ├── chat/                   # Conversación, mensajes y compositor
│   ├── dashboard/              # Panel, perfil y desglose del score
│   ├── finance/                # Calculadoras y gráficos financieros
│   ├── layout/                 # Navegación, portada y arquitectura visual
│   ├── notifications/          # Bandeja y avisos
│   ├── property/               # Anuncios, mapa y tarjetas de contexto
│   └── ui/                     # Elementos compartidos
├── hooks/                      # Estado de chat, favoritos y perfil
├── lib/                        # Lógica del producto e integraciones
│   ├── agent/                  # Prompt, bucle del agente y herramientas
│   ├── commute/                # Geocodificación y trayectos
│   ├── finance/                # Motor de compra frente a alquiler
│   ├── idealista/              # API, datos demo, caché y cuota
│   ├── market/                 # Fuentes de mercado y procedencia
│   ├── neighborhood/           # Informes de contexto territorial
│   ├── notifications/          # Identidad y selección diaria
│   ├── supabase/               # Acceso a datos desde el servidor
│   └── valoracion/             # Cliente y contrato del servicio Python
├── data/madrid/                # Instantáneas oficiales y fuentes pequeñas
├── public/                     # Imágenes, vídeo y recursos servidos por la web
├── scripts/                    # Importación de datos y tareas de mantenimiento
├── tests/                      # Pruebas automáticas sin red ni credenciales
├── supabase/                   # Esquema, migraciones, cron y pruebas SQL
├── types/                      # Contratos TypeScript compartidos
├── docs/                       # Guías técnicas y de operación
└── .github/workflows/ci.yml     # Verificación automática en GitHub
```

Se utiliza **npm**, con `package-lock.json` como único archivo de bloqueo. La aplicación combina Next.js 15, React 19, TypeScript, Tailwind CSS, MapLibre, el SDK de Anthropic y Supabase. [Arquitectura y flujo de datos](docs/arquitectura.md).

## 5. Comprobar que todo funciona

```bash
npm run check
```

Ejecuta, en orden, las pruebas, la comprobación de tipos, ESLint y la compilación de producción. Las pruebas usan datos simulados y bloquean el acceso a proveedores. La compilación carga las variables de tu entorno; para verificar una instalación de ejemplo, utiliza el `.env.local` descrito arriba.

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo con recarga automática |
| `npm test` | Todas las pruebas de la aplicación |
| `npm run typecheck` | Comprobar TypeScript sin generar archivos |
| `npm run lint` | Comprobar estilo y reglas de Next.js |
| `npm run build` | Crear la compilación de producción |
| `npm start` | Servir la compilación ya creada |
| `npm run check` | Verificación completa |

GitHub Actions comprueba vulnerabilidades conocidas y ejecuta la misma verificación en los pushes a `main` y en las pull requests, sin credenciales de proveedores. Las pruebas SQL se ejecutan por separado en una base desechable: [Desarrollo y pruebas](docs/desarrollo.md).

## 6. Alcance académico

- La búsqueda, el inicio, el agente y la demo se limitan a **Madrid capital**, para compra y alquiler. Se comprueban la zona y el centro antes de consultar Idealista; también se filtran resultados de radios que crucen el límite municipal. Los orígenes de trayecto pueden estar fuera de Madrid.
- El modelo externo estima **precios anunciados de venta de Madrid de 2018**. Su indexación temporal es un escenario; no valida la precisión en anuncios actuales ni en precios de compraventa.
- El predictor XGBoost v3 recibido en `habitia_predictor` (exportado el 16/09/2026 a las 11:57:54, 410 árboles) conserva sus 21 variables y pesos; actualiza los índices de venta y renta y el alquiler del barrio a un escenario proyectado de 2026. No incluye intervalos calibrados ni bandas. Fair usa la desviación frente a la estimación individual en una escala provisional de 0–100. Admite anuncios de compra y alquiler (contrato 3.3.0): compara el precio total de venta o la mensualidad en €/mes. Su renta deriva del valor de venta estimado y ratios proyectados a 2026, sin validación independiente de alquiler. Las últimas fuentes observadas son venta de 2025 y alquiler de 2024. Los resultados LightGBM de la presentación siguen identificados como evaluación histórica de otro modelo.
- Las métricas de XGBoost son las declaradas en el paquete; no se dispone de sus particiones ni predicciones de test para auditarlas. La evaluación retrospectiva agrupada por inmueble corresponde al experimento LightGBM anterior y se identifica como antecedente.
- El HabitIA Score combina Fair, Opportunity, Zone y Lifestyle. Los componentes sin evidencia no aportan puntos y sus pesos no se redistribuyen. Opportunity compara, en compra y alquiler, la variación anual de oferta del distrito con Madrid (Idealista, agosto 2025–agosto 2026). Zone promedia cuatro percentiles de recuentos de distrito (zonas verdes, actuaciones policiales, transporte y servicios), con un peso del 25% cada uno. Descanso queda fuera del cálculo. Con los cuatro disponibles, la cobertura interna es del 100%. El dashboard muestra el HabitIA Score numérico y señala cuando faltan datos.
- Las fuentes oficiales de barrio aportan contexto. Sus recuentos no se convierten en índices de seguridad o calidad de vida.
- La comparación de compra y alquiler calcula escenarios según los supuestos introducidos; no predice el mercado.

La memoria, los anexos, los artefactos de inferencia y la API Python se encuentran en el repositorio académico público [habitia-tfm](https://github.com/maupeon/habitia-tfm). Su [release de entrega](https://github.com/maupeon/habitia-tfm/releases/tag/tfm-2026-09-16-r3) reúne documentos y artefactos de acceso público.

## 7. Documentación

| Guía | Qué explica |
| --- | --- |
| [Configuración y despliegue](docs/configuracion.md) | Variables, Supabase, cuotas y publicación |
| [Arquitectura](docs/arquitectura.md) | Responsabilidades, flujo de búsqueda y API |
| [Servicio Python externo](docs/modelo-externo.md) | Conexión, contrato, abstenciones y resultados |
| [Datos y procedencia](docs/datos.md) | Archivos conservados, fuentes y reproducción |
| [Desarrollo y pruebas](docs/desarrollo.md) | Verificación, mantenimiento y solución de problemas |
| [Notificaciones](docs/notificaciones.md) | Instalación, horarios, privacidad y operación del cron |
| [Contribuir](CONTRIBUTING.md) | Convenciones para trabajar en el repositorio |

## Equipo

Mauricio Peón García · João Paulo Nogueira Cunha · Manuel Macedo Púlido · Aldo Mauricio Ress Villets · Tomás Perales Lara.
