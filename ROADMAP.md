# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (10 Jul 2026)

| Aspecto | Estado | Nota |
|---------|--------|------|
| Tests | ✅ | 257 unit (221 web + 36 api) + 49 E2E specs pasando, 0 errores |
| Lint | ✅ | Sin warnings |
| Build | ✅ | Compila correctamente |
| CI | ✅ | CI en PRs y push a cualquier branch |
| CD / Deploy | 🟡 | No hay entornos de pre-release/staging (ver I02) |
| Dependencias | ✅ | Al día (Fase 1 + Fase 2 aplicadas) |
| Coverage | ✅ | Medido con Jest |
| E2E | ✅ | Playwright: 49 specs, 5 browsers, CI integrado |
| Theming | ✅ | Light/dark mode con toggle, persistencia (localStorage) y zero-flash (spec `theme-toggle` + `theme-system`) |
| Monitoreo | ❌ | No implementado |
| **Datos reales** | ❌ | **Ningún proveedor conectado** — `apps/api/src/modules/` vacío; las 12 páginas de categoría son placeholders (ver Estrategia de Proveedores + P1) |

---

## 🌐 Estrategia de Proveedores de Datos

> Prioridad del proyecto: conectar primero un proveedor **libre para uso comercial** que popule la mayor cantidad de secciones posible, partiendo de las colecciones de Postman ya validadas en `postman/`.

### Decisión recomendada: OWID como primer proveedor

**Our World in Data (OWID)** es el primer proveedor a conectar. Justificación:

- **Licencia CC BY** — uso comercial y con publicidad permitido, solo requiere atribución (ver I14).
- **Sin API key, sin rate limits, CORS habilitado** — cero fricción operativa, sin secrets que gestionar.
- **Dos modos de consumo, ambos ya validados en la colección Postman** (`Our World in Data — Ecology, Humanity & Sustainability`):
  - **Grapher CSV/JSON:** `https://ourworldindata.org/grapher/{slug}.csv?csvType=full` (+ `.metadata.json`) — series país-año armonizadas.
  - **API v1 JSON:** `https://api.ourworldindata.org/v1/indicators/{id}.data.json` + `.metadata.json` — ideal para el BFF (JSON nativo, sin parsear CSV).
- **Máxima cobertura de secciones:** es el único proveedor que toca 11 de las 12 categorías con al menos una métrica relevante (ver matriz abajo).

**Complementos posteriores (también comercial-safe, con colección Postman propia):**

| Proveedor | Licencia | Aporta | Cuándo |
|---|---|---|---|
| **NOAA** (GML, Tides & Currents, NSIDC, NCEI) | Dominio público | Series casi en tiempo real: CO₂ ppm mensual (Mauna Loa), nivel del mar, sea ice diario, anomalías de temperatura | 2.º proveedor — agrega frescura a co2-emissions, ocean-health, glacier-melting, global-temperature |
| **World Bank Open Data** | CC BY | REST JSON real por país/indicador (CORS, sin key): CO₂ sectorial, mix energético, área forestal, especies amenazadas, agua, PM2.5 | 3.º proveedor — profundidad por país y comparativas |

**Descartados para producción comercial (mantener solo para prototipos):**

- **Open-Meteo** — el tier gratuito es **solo no comercial**; uso comercial requiere plan pago. Su colección Postman queda como referencia/prototipo.
- **IUCN Red List API** — solo no comercial (la vía comercial es IBAT). Alternativas: contadores de especies amenazadas de World Bank/OWID + GBIF (CC BY).
- **Global Forest Watch** — CC BY-NC-SA en datasets clave. Alternativas: OWID deforestation + FAOSTAT + Hansen (CC BY).

### Matriz de cobertura por categoría (solo proveedores comercial-safe)

| Categoría | OWID (1.º) | NOAA (2.º) | World Bank (3.º) | Métrica inicial sugerida |
|---|---|---|---|---|
| co2-emissions | ✅ anual, per cápita, sectorial, acumulado | ✅ CO₂ ppm mensual | ✅ CO₂/GHG por país | Emisiones anuales por país (OWID) |
| global-temperature | ✅ anomalía global | ✅ NCEI series 1880– | 🟡 CCKP | Anomalía de temperatura (OWID) |
| energy-sources | ✅ mix eléctrico por fuente, % renovables | — | ✅ % renovables, mix | Electricity generation by source (OWID) |
| plastic-pollution | ✅ producción, mismanaged, fate | 🟡 Marine Debris (estático) | — | Global plastics production (OWID) |
| waste-recycling | ✅ CH₄ waste 1990–2023, plastic fate | — | ✅ indicadores urbanos | CH₄ from waste (OWID API v1, ID 1146696) |
| deforestation | ✅ annual deforestation, forest area | — | ✅ área forestal | Forest area (OWID) |
| reforestation | 🟡 forest area neto (proxy) | — | 🟡 área forestal | Net forest change (OWID/FAOSTAT) |
| endangered-species | ✅ threatened species (IUCN counts), Living Planet Index | — | ✅ mamíferos/aves/peces amenazados | Threatened species por país (World Bank u OWID) |
| ocean-health | ✅ sea level rise | ✅ mareas/nivel del mar, SST (ERDDAP) | 🟡 áreas marinas protegidas | Sea level rise (OWID) |
| glacier-melting | ✅ mass balance glaciares de referencia | ✅ sea ice index diario (NSIDC) | — | Sea ice extent (NOAA) o mass balance (OWID) |
| water-footprint | ✅ freshwater withdrawals, water stress | — | ✅ recursos hídricos, extracción | Water stress (OWID, chart `freshwater-withdrawals-as-a-share-of-internal-resources`) |
| air-quality | 🟡 PM2.5 exposure anual, muertes por contaminación | — | ✅ PM2.5 exposure anual | PM2.5 exposure anual (World Bank/OWID) |

> ⚠️ **air-quality en tiempo real** es la única sección sin opción comercial-safe sin key: Open-Meteo es no comercial y OpenAQ tiene licencias heterogéneas. Opción viable: **OpenWeatherMap Air Pollution** (ODbL, comercial OK con atribución, key gratuita, 1M req/mes) — postergarlo a una fase posterior y arrancar con datos anuales de exposición PM2.5 (comercial-safe, sin key).

---

## 🔴 Crítico / Alta Prioridad

### P1: Conectar primer proveedor (OWID) e implementar módulos de categorías eco

**Problema:** `apps/api/src/modules/` solo tiene `.gitkeep`. No hay lógica real para ninguna categoría y las 12 páginas de categoría del frontend son placeholders (icono + título).

**Impacto:** El BFF solo sirve `/health`, no hay datos reales.

**Decisión de fuente:** OWID como primer proveedor (ver *Estrategia de Proveedores*). Corrección respecto a la versión anterior de este plan: se **reemplaza `air-quality` por `energy-sources`** en la primera tanda — air-quality en tiempo real no tiene opción comercial-safe sin key (Open-Meteo es no comercial), mientras que CO₂/temperatura/energía se cubren 100% con OWID.

**Propuesta por fases** (cada fase = una propuesta OpenSpec independiente):

#### P1.0 — Fundación de la capa de datos (prerequisito de todo lo demás)

1. **Tipos compartidos** en `packages/shared`: `MetricSeries` (puntos año/valor por entidad), `MetricPoint`, `DataSourceAttribution` (provider, license, sourceUrl, lastUpdated) — la atribución viaja en `ApiResponse<T>.meta` (ver I15).
2. **Cliente HTTP del BFF**: `@nestjs/axios` (o `fetch` nativo de Node 24 envuelto en un service) con timeout, retry acotado y User-Agent identificable.
3. **Caching**: `@nestjs/cache-manager` en memoria con TTL 24 h para respuestas de OWID (datos anuales — no necesitan frescura mayor). Sin base de datos en esta fase (I06 sigue en backlog).
4. **`OwidClient` service** (`apps/api/src/modules/providers/owid/`): métodos `getIndicatorData(id)` / `getIndicatorMetadata(id)` (API v1 JSON) y `getGrapherSeries(slug)` (CSV → parseo server-side). Fixtures de test tomados de las respuestas de la colección Postman.
5. **Health indicator**: `HttpHealthIndicator` de `@nestjs/terminus` contra un endpoint liviano de OWID, registrado en `HealthModule` (requisito ya acordado con P2).
6. **Config**: TTLs y base URLs como env vars tipadas en `AppConfigService` (+ `.env.example` + README).

#### P1.1 — Primer módulo end-to-end: `co2-emissions`

La categoría con mejor relación datos/esfuerzo (OWID CO₂ dataset: anual, per cápita, sectorial, acumulado — ya validado en Postman).

- `Co2EmissionsModule` + controller: `GET /api/v1/co2-emissions/series?country=ARG&from=1990` (DTOs con `class-validator` para ISO-3166, rangos de años).
- Service que mapea OWID → `MetricSeries` con `DataSourceAttribution`.
- Swagger tag + tests unitarios con fixtures (sin llamadas de red en tests).
- **Frontend:** la página `/co2-emissions/` deja de ser placeholder — Server Component con `fetch` al BFF e ISR (`revalidate: 86400`), Suspense boundary (resuelve I09 para esta ruta) y primer gráfico de líneas (requiere decidir librería de charts, ver I16; al integrarla aplica el recordatorio de `next/dynamic`).
- **Atribución visible** "Data: Our World in Data (CC BY)" (ver I14 — requisito legal de la licencia).

#### P1.2 — `global-temperature` (OWID temperature anomaly) — replica el patrón de P1.1
#### P1.3 — `energy-sources` (OWID electricity generation by source + % renovables) — ídem

**Criterio de éxito de P1:** 3 categorías con datos reales comercial-safe en producción, healthcheck agregando dependencias externas, patrón replicable documentado en AGENTS.md para las 9 categorías restantes.

**Dificultad:** P1.0: 5/10 · P1.1: 6/10 (incluye la primera integración frontend + charts) · P1.2/P1.3: 3/10 c/u (patrón ya establecido)
**Requisitos:**
- P2 instala `@nestjs/terminus` pero no refactoriza el healthcheck. **Cada módulo de P1 debe agregar su propio `HttpHealthIndicator` al `HealthModule`** para validar su API externa (OWID, NOAA, World Bank). Esto convierte el healthcheck en un agregado real de dependencias externas. P1.0 puede instalar `@nestjs/terminus` directamente si se ejecuta antes que P2.
- I03 (CORS multi-origen) pasa a ser bloqueante cuando el frontend en Vercel consuma el BFF en Railway — resolverlo dentro de P1.1 o antes del deploy del back.
**Estado:** Pendiente

---

## 🟡 Importante / Media Prioridad

### P2: Monitoreo y Observabilidad

**Problema:** No hay logs estructurados, métricas ni error tracking.

**Impacto:** En producción será imposible diagnosticar fallos sin logs JSON ni stack traces legibles (source maps). El healthcheck actual solo confirma que el proceso está vivo, no que sus dependencias externas respondan.

**Propuesta:** Implementar un stack de observabilidad completo con alcance claro por plataforma:

#### Backend — `apps/api`

- **Logging estructurado:** `nestjs-pino` + `pino-http` como reemplazo del Logger interno de NestJS.
  - Salida JSON nativa, correlation IDs vía `X-Request-ID` (header propagado desde el frontend).
  - Redacción de headers sensibles: `Authorization`, `Cookie`, `X-API-Key`.
  - Niveles por entorno: `debug` en development, `info` en production.
- **Error tracking:** `@sentry/nestjs` con instrumentación automática de guards, filters e interceptors.
  - Proyecto Sentry dedicado: `eco-metrics-earth-api`.
  - Source maps subidos en build de producción (`NODE_ENV=production`).
  - Release identificado por git SHA (`GITHUB_SHA` en CI/CD).
- **Healthcheck:** Instalar `@nestjs/terminus` (sin refactorizar el módulo actual — eso se hace en P1 cuando existan las APIs externas).

#### Frontend — `apps/web`

- **Error tracking:** `@sentry/nextjs` con `withSentryConfig()` wrapper en `next.config.ts`.
  - Proyecto Sentry dedicado: `eco-metrics-earth-web`.
  - Cobertura: Server Components, Client Components y Edge runtime.
  - `Sentry.ErrorBoundary` en el layout raíz para captura de errores de renderizado en cliente.
  - Source maps subidos automáticamente en build de Vercel (`SENTRY_AUTH_TOKEN`).
  - CSP actualizado: `connect-src` debe incluir `https://*.sentry.io`.
- **Sin librería de logging:** Vercel captura stdout/stderr del lado servidor; los errores de cliente van a Sentry. No se justifica Pino/Winston en el frontend.

#### CI/CD — ambos

- `SENTRY_DSN` en variables de entorno de Vercel y Railway (uno por proyecto Sentry).
- `SENTRY_AUTH_TOKEN` en secrets de CI/CD para subir source maps.

#### Alertas — configuración en Sentry (sin código)

- **1 alerta de error rate:** notificar por email cuando errores 5xx superen 3 por minuto.
- **1 alerta de healthcheck:** notificar cuando `/api/v1/health` falle más de 2 veces en 5 minutos.
- Canal: email (free tier incluido). Slack queda como opcional futuro.

#### Stack final

| Componente | Tecnología | Dónde |
|---|---|---|
| Logging estructurado | `nestjs-pino` + `pino-http` | `apps/api` |
| Error tracking front | `@sentry/nextjs` | `apps/web` |
| Error tracking back | `@sentry/nestjs` | `apps/api` |
| Source maps upload | `withSentryConfig` + `SENTRY_AUTH_TOKEN` | CI/CD (Vercel + Railway) |
| Healthcheck lib | `@nestjs/terminus` (instalar, sin refactorizar) | `apps/api` |
| Healthcheck sin throttler | `@SkipThrottle()` en health endpoint | `apps/api` |
| CSP Sentry | `connect-src` → incluir `*.sentry.io` | `next.config.ts` |
| Alertas | Email (error rate + healthcheck) | Dashboard Sentry |

**Fuera de P2 → backlog:**
- OpenTelemetry (I10): relevante cuando escalen los servicios o se quiera cambiar de backend de observabilidad sin tocar código de instrumentación.
- Axiom (I11): solo si la retención de logs de Railway (7 días) o Vercel resulta insuficiente.

**Dificultad:** 5/10 — mayoritariamente instalación de paquetes, configuración de env vars y wrapping de configs existentes. El punto más técnico es la integración de source maps en los pipelines de build.
**Requisitos:** Cuenta Sentry (free tier suficiente), `SENTRY_AUTH_TOKEN` en secrets de CI/CD.
**Estado:** Pendiente

---

## 📋 Plan de Acción Sugerido

Si no estás seguro por dónde empezar, este es el orden recomendado:

1. **P1.0: Fundación de capa de datos** → Cliente OWID + caching + health indicator (Dificultad: 5/10)
2. **P1.1: Módulo `co2-emissions` end-to-end** → Primera sección con datos reales + charts (Dificultad: 6/10)
3. **P1.2 / P1.3: `global-temperature` y `energy-sources`** → Replicar el patrón (Dificultad: 3/10 c/u)
4. **P2: Monitoreo y observabilidad** → Logs, métricas y error tracking (Dificultad: 5/10)

---

## 🟡 CI/CD / Deploy

### P3: CI/CD con deploy condicional — Vercel (web) + Railway (api)

> Renumerado de P4 → P3 (no existía P3; regla de secuencia continua de las Notas).

**Problema:** Actualmente no hay deploy automático a producción. El CI solo corre lint + typecheck + build + test + e2e, pero no despliega nada.

**Impacto:** Cada cambio en `main` requiere deploy manual. No hay separación entre cambios de frontend y backend.

**Propuesta:** Implementar dos workflows de GitHub Actions con path-based triggers:

| App | Plataforma | Se dispara cuando cambia | Comando de deploy |
|---|---|---|---|
| `apps/web` | Vercel | `apps/web/**` o `packages/shared/**` | `npx nx build web --prod` → Vercel auto-deploy (GitHub Integration) |
| `apps/api` | Railway | `apps/api/**` o `packages/shared/**` | `npx nx build api` → `railway up` o auto-deploy desde GitHub |

**Flujo completo:**
```
git push main
  │
  ├─► CI (lint → typecheck → build → test → e2e)
  │
  ├─► ¿Cambió apps/web/ o packages/shared/?
  │     SÍ → Vercel deploy automático
  │     NO → skip (Ignored Build Step)
  │
  └─► ¿Cambió apps/api/ o packages/shared/?
        SÍ → Railway deploy automático
        NO → skip
```

**Dependencias:** P1 (APIs deben existir para que Railway tenga algo que servir), `vercel.json` ya está creado en la raíz del repo.

**Dificultad:** 4/10
**Requisitos:** Cuenta Vercel + Railway vinculadas al repo. La integración de Vercel ya está configurada con `vercel.json`.
**Estado:** ✅ Completado — Vercel auto-deploy configurado vía GitHub Integration

---

## Notas

- **Dificultad:** escala 1-10 donde 1 es trivial y 10 es extremadamente complejo
- Cada propuesta se trabajará en sesiones independientes
- Antes de implementar, se creará una propuesta OpenSpec siguiendo el workflow SDD
- Este documento se actualizará conforme se completen propuestas
- **Al eliminar un plan o una idea del backlog, renumerar todos los `Ixx` o `Pxx` siguientes** para mantener la secuencia continua sin huecos

---

## 💡 Ideas — Backlog de mejoras identificadas

Lista de hallazgos del análisis de repositorio, ordenados por prioridad (más crítico primero). Cada ítem puede convertirse en una propuesta formal siguiendo el workflow SDD.

### 🔴 Seguridad

- **I01.** `npm audit` reporta 32 vulnerabilidades (31 moderate, 1 high). La mayoría están en dependencias transitivas que el proyecto no controla: `@module-federation/*` (29 vulns, dentro de NX 22) y `yaml` (2 vulns, bundleado en `node_modules/nx/`). No son solucionables con `npm audit fix` desde el proyecto — requieren un upgrade de NX a una versión más reciente, lo cual es un cambio mayor con posibles breaking changes.

### 🟡 CI/CD

- **I02.** Staging parcial — Vercel genera preview deploys automáticos desde `develop`, lo que funciona como staging de facto para el frontend. Falta definir el equivalente en Railway para `apps/api` cuando se implemente el deploy del backend (recordatorio).

### 🟡 API / Seguridad

- **I03.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único en `AppConfigService`. Cuando web (Vercel preview + prod) y API (Railway) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo). Migrar a lista separada por comas (o regex para previews de Vercel). **Bloqueante para P1.1** cuando el frontend desplegado consuma el BFF.

### 🟡 Testing

- **I04.** Sin tests de integración web→API con datos reales. Los tests E2E (`api-health.spec.ts`) verifican health + errores + CORS, pero falta integración con datos de categorías eco (depende de P1).
- **I05.** Sin tests de accesibilidad unitarios con `jest-axe`. Los tests E2E con `@axe-core/playwright` ya auditan todas las páginas (a11y.spec.ts), lo que cubre el 80% del valor. La integración a nivel componente unitario es deseable pero no prioritaria — solo suma valor si crece mucho la cantidad de componentes.

### 🟢 Arquitectura / Deuda técnica

- **I09.** Sin Suspense boundaries — el App Router de Next.js está diseñado alrededor de Suspense + streaming para manejar estados de carga y errores. Actualmente las páginas renderizan sincrónicamente sin límites de Suspense, lo que bloquea el main thread durante transiciones de ruta. Requisito previo para P1 (data fetching real).
- **I06.** Sin capa de datos ni ORM — cuando empiece la integración real de datos, no hay TypeORM, Prisma ni esquema de base de datos definido.

### 🟢 Configuración / Build

- **I07.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.
- **I08.** Sin Storybook ni documentación visual de componentes. Actualmente solo hay 16 componentes, por lo que no se justifica el overhead de configuración y mantenimiento. Reconsiderar cuando la librería de componentes supere ~40 unidades.


### 🟢 UI / Diseño

- **I12.** Visibilidad de iconos SVG en modo claro/oscuro — algunos iconos de categoría (especialmente reforestation, ocean-health, plastic-pollution) no contrastan bien con el fondo en modo claro: se pierden detalles o bordes por falta de separación visual. En modo oscuro el problema es menor pero persiste en detalles finos. **Ahora accionable**: light/dark mode ya está en producción (spec `light-mode-styling` archivado).

**Restricción de diseño (decisión registrada en el spec `light-mode-styling`):** los iconos de categoría son **intencionalmente multicolor** — sus colores de marca (verdes, azules, rojos) son parte de la identidad visual de cada categoría y no deben recolorearse ni tintarse por tema. Por eso el fix debe mejorar el **contraste/separación** sin tocar los colores del SVG.

**Propuesta:** Evaluar alternativas de contraste que respeten los colores originales:
- **Drop shadow / glow** sutil alrededor de los paths (ej: filter: drop-shadow() en SVG o un contenedor wrapper).
- **Border o stroke** exterior en los iconos (ej: contenedor circular o card con borde sutil).
- **Background highlight** — un fondo semi-transparente o gradiente sutil detrás del icono para separarlo del fondo de la página.

**Descartado:** invertir/tintar dinámicamente los colores del SVG según `prefers-color-scheme`, o reemplazar los iconos por componentes con prop `theme` que ajusten fill/stroke — contradice la decisión de mantenerlos multicolor.

**Dificultad:** 3/10 — mayoritariamente CSS/Tailwind y ajuste visual.
**Estado:** Pendiente

### 🟡 Datos / Proveedores

- **I13.** Atribución de datos (requisito legal, no opcional) — CC BY exige atribución visible. Antes de publicar la primera sección con datos reales (P1.1): componente de atribución al pie de cada visualización ("Data: Our World in Data — CC BY" con link) + página `/data-sources/` listando proveedores y licencias. Alimentado por el `DataSourceAttribution` de I14. Bonus SEO: contenido indexable con estructura.
- **I14.** Extender `ApiResponse<T>` con metadata de fuente — el contrato actual no transporta procedencia. Agregar `meta: { source: DataSourceAttribution; fetchedAt: string }` para que el frontend renderice atribución y frescura sin hardcodear nada por página. Diseñarlo en P1.0 para no romper el contrato después.
- **I15.** Elegir librería de charts — P1.1 necesita el primer gráfico de series temporales. Candidatas: **Recharts** (React-first, liviana, suficiente para líneas/áreas/barras), **ECharts** (más potente, pesada — justifica `next/dynamic`), **visx** (control total, más esfuerzo). Recomendación: empezar con Recharts y reevaluar si aparecen mapas/heatmaps. La decisión activa el recordatorio de Dynamic Imports.

### 🟢 Documentación

- **I16.** `postman/README.md` desactualizado — la tabla de archivos lista nombres kebab-case (`world-bank.collection.json`) que no coinciden con los archivos reales (`World Bank Open Data API — Environment & Development.postman_collection.json`, etc.). Corregir la tabla o renombrar los archivos a kebab-case (preferible: renombrar, evita espacios y em-dashes en paths).

---

### 📝 Recordatorios

- **Dynamic Imports (`next/dynamic`)** — No implementar todavía. Los chunks actuales pesan ~1KB por página, y dynamic imports agregarían complejidad (loading states por import, layout shift) sin beneficio real hoy. Reconsiderar cuando se integren librerías pesadas como charting libraries (d3, echarts) o widgets de terceros.

- **I10.** OpenTelemetry — considerado para el futuro cuando el sistema escale a múltiples servicios o se quiera cambiar de backend de observabilidad (Sentry → Datadog, Honeycomb, etc.) sin tocar código de instrumentación. Con un solo BFF, Sentry Performance cubre el tracing necesario. No justifica el overhead de configuración actual (collector, exporters, SDK setup).
- **I11.** Axiom — plataforma de logs como servicio. Solo relevante si la retención de logs de Railway (7 días) o Vercel resulta insuficiente para debugging post-mortem. Por ahora los logs agregados de cada plataforma son suficientes.

**Última actualización:** 11 Jul 2026
