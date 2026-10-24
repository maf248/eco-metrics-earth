# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (24 Oct 2026)

| Aspecto          | Estado | Nota                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests            | ✅     | 739 unit (459 web + 250 api + 30 shared) + 342 instancias E2E (5 browsers) pasando, 0 errores                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Lint             | ✅     | Sin warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Build            | ✅     | Compila correctamente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| CI               | ✅     | CI en PRs y push a cualquier branch (`permissions` mínimos; `concurrency` a nivel job que cancela corridas reemplazadas sin cortar deploys); guardia de lockfile podado del API (`api:prune` + `npm ci --dry-run`); el nombre del job es contrato con Vercel Deployment Checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| CD / Deploy      | ✅     | web: Vercel (auto-deploy desde GitHub; producción retenida por Deployment Check hasta CI verde, commits de release salteados); api: Cloud Run (`deploy-api.yml` reutilizable llamado desde CI con `needs`: `main` → `eco-metrics-api` (`eco-metrics-api-fexi2yqv2q-uc.a.run.app`), `develop` → `eco-metrics-api-dev` consumido por los previews de Vercel; detección de cambios contra el SHA desplegado en cada servicio, imagen reproducible con `npm ci` desde lockfile podado, una imagen por entorno en Artifact Registry (`api-production` / `api-development`) con cleanup policy que conserva las últimas 3 de cada una; CORS de producción solo para el dominio de producción); `/water-footprint/` se genera en el primer request y tolera cold starts (2 intentos de 10 s + stale-if-error del ISR)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Dependencias     | 🟡     | Producción sin advisories (`npm audit --omit=dev` limpio). Dependabot alerts activas (pestaña Security; los PRs automáticos de seguridad quedan apagados porque GitHub los abre contra `main`). Las del `npm` empaquetado por `@semantic-release/npm` (`brace-expansion`, `undici`, `http-cache-semantics`, `ip-address`, `postcss-selector-parser`) se cerraron al subirlo a `npm@11.21.1` dentro de su rango `^11`. Next.js 16.4.2 cierra 3 advisories de producción (RCE en Image Optimization con SVG y en `use cache`, DoS en Server Actions). Las advisories de `braces` y `sprintf-js` (tooling de desarrollo) fueron retiradas por GitHub (22–23 Oct 2026) y `zod` se actualizó a 4.6.7 dentro de su rango. La única restante es `ip-address` ≤10.7.3 (GHSA-rxp7-6hxx-x8q5, moderada), dentro del `npm@11.21.1` empaquetado, que ya es el último de `^11`: esperar un release de npm 11 que lo actualice. `multer` 2.4.0 (GHSA-q7qp-rjg7-q26m, producción) no se puede forzar a 2.5.0: `@nestjs/platform-express` 12.2.0 lo fija exacto y el `package.json` podado del API no hereda los `overrides` de la raíz, así que el `npm ci` del Dockerfile falla (lo detecta el chequeo del lockfile podado en CI). La API no usa `multer` (sin endpoints de subida), así que la alerta se descartó como código no usado; retomar cuando Nest suba su `multer`. `axios`, `brace-expansion@5`, `follow-redirects` (1.16.1, GHSA-8r9p-f939-6h3c y GHSA-q3jh-wrc6-jgq8) y `smol-toml` (pins exactos de `nx`; el de `smol-toml` se puede quitar al pasar a `nx` ≥ 23.3, que ya trae 1.9.0) se fuerzan vía `overrides`. |
| Coverage         | ✅     | Medido con Jest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| E2E              | ✅     | Playwright: 110 tests en 9 specs, 5 browsers, CI integrado, arranque determinista (readiness de ambos puertos)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Theming          | ✅     | Light/dark mode con toggle, persistencia (localStorage) y zero-flash (spec `theme-toggle` + `theme-system`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Monitoreo        | ❌     | No implementado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Datos reales** | 🟡     | **Ningún proveedor externo expuesto todavía** (cliente OWID + cache listos en el BFF, sin endpoints) — water-footprint completa (dataset estático + UI + tests E2E con datos reales); atribución y página `/data-sources/` servidas por el BFF (`GET /api/v1/data-sources`); las 11 páginas restantes siguen como placeholders (ver Estrategia de Proveedores + P1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## 🌐 Estrategia de Proveedores de Datos

> Prioridad del proyecto: conectar primero un proveedor **libre para uso comercial** que popule la mayor cantidad de secciones posible, partiendo de las colecciones de Postman ya validadas en `postman/`.

### Decisión recomendada: OWID como primer proveedor

**Our World in Data (OWID)** es el primer proveedor a conectar. Justificación:

- **Licencia CC BY** — uso comercial y con publicidad permitido, solo requiere atribución (ver la página `/data-sources/`).
- **Sin API key, sin rate limits, CORS habilitado** — cero fricción operativa, sin secrets que gestionar.
- **Dos modos de consumo, ambos ya validados en la colección Postman** (`Our World in Data — Ecology, Humanity & Sustainability`):
  - **Grapher CSV/JSON:** `https://ourworldindata.org/grapher/{slug}.csv?csvType=full` (+ `.metadata.json`) — series país-año armonizadas.
  - **API v1 JSON:** `https://api.ourworldindata.org/v1/indicators/{id}.data.json` + `.metadata.json` — ideal para el BFF (JSON nativo, sin parsear CSV).
- **Máxima cobertura de secciones:** es el único proveedor que toca 11 de las 12 categorías con al menos una métrica relevante (ver matriz abajo).

**Complementos posteriores (también comercial-safe, con colección Postman propia):**

| Proveedor                                     | Licencia        | Aporta                                                                                                                            | Cuándo                                                                                             |
| --------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **NOAA** (GML, Tides & Currents, NSIDC, NCEI) | Dominio público | Series casi en tiempo real: CO₂ ppm mensual (Mauna Loa), nivel del mar, sea ice diario, anomalías de temperatura                  | 2.º proveedor — agrega frescura a co2-emissions, ocean-health, glacier-melting, global-temperature |
| **World Bank Open Data**                      | CC BY           | REST JSON real por país/indicador (CORS, sin key): CO₂ sectorial, mix energético, área forestal, especies amenazadas, agua, PM2.5 | 3.º proveedor — profundidad por país y comparativas                                                |

**Descartados para producción comercial (mantener solo para prototipos):**

- **Open-Meteo** — el tier gratuito es **solo no comercial**; uso comercial requiere plan pago. Su colección Postman queda como referencia/prototipo.
- **IUCN Red List API** — solo no comercial (la vía comercial es IBAT). Alternativas: contadores de especies amenazadas de World Bank/OWID + GBIF (CC BY).
- **Global Forest Watch** — CC BY-NC-SA en datasets clave. Alternativas: OWID deforestation + FAOSTAT + Hansen (CC BY).

### Matriz de cobertura por categoría (solo proveedores comercial-safe)

| Categoría          | OWID (1.º)                                               | NOAA (2.º)                            | World Bank (3.º)                   | Métrica inicial sugerida                                                             |
| ------------------ | -------------------------------------------------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| co2-emissions      | ✅ anual, per cápita, sectorial, acumulado               | ✅ CO₂ ppm mensual                    | ✅ CO₂/GHG por país                | Emisiones anuales por país (OWID)                                                    |
| global-temperature | ✅ anomalía global                                       | ✅ NCEI series 1880–                  | 🟡 CCKP                            | Anomalía de temperatura (OWID)                                                       |
| energy-sources     | ✅ mix eléctrico por fuente, % renovables                | —                                     | ✅ % renovables, mix               | Electricity generation by source (OWID)                                              |
| plastic-pollution  | ✅ producción, mismanaged, fate                          | 🟡 Marine Debris (estático)           | —                                  | Global plastics production (OWID)                                                    |
| waste-recycling    | ✅ CH₄ waste 1990–2023, plastic fate                     | —                                     | ✅ indicadores urbanos             | CH₄ from waste (OWID API v1, ID 1146696)                                             |
| deforestation      | ✅ annual deforestation, forest area                     | —                                     | ✅ área forestal                   | Forest area (OWID)                                                                   |
| reforestation      | 🟡 forest area neto (proxy)                              | —                                     | 🟡 área forestal                   | Net forest change (OWID/FAOSTAT)                                                     |
| endangered-species | ✅ threatened species (IUCN counts), Living Planet Index | —                                     | ✅ mamíferos/aves/peces amenazados | Threatened species por país (World Bank u OWID)                                      |
| ocean-health       | ✅ sea level rise                                        | ✅ mareas/nivel del mar, SST (ERDDAP) | 🟡 áreas marinas protegidas        | Sea level rise (OWID)                                                                |
| glacier-melting    | ✅ mass balance glaciares de referencia                  | ✅ sea ice index diario (NSIDC)       | —                                  | Sea ice extent (NOAA) o mass balance (OWID)                                          |
| water-footprint    | ✅ freshwater withdrawals, water stress                  | —                                     | ✅ recursos hídricos, extracción   | Water stress (OWID, chart `freshwater-withdrawals-as-a-share-of-internal-resources`) |
| air-quality        | 🟡 PM2.5 exposure anual, muertes por contaminación       | —                                     | ✅ PM2.5 exposure anual            | PM2.5 exposure anual (World Bank/OWID)                                               |

> ⚠️ **air-quality en tiempo real** es la única sección sin opción comercial-safe sin key: Open-Meteo es no comercial y OpenAQ tiene licencias heterogéneas. Opción viable: **OpenWeatherMap Air Pollution** (ODbL, comercial OK con atribución, key gratuita, 1M req/mes) — postergarlo a una fase posterior y arrancar con datos anuales de exposición PM2.5 (comercial-safe, sin key).

---

## 🔴 Crítico / Alta Prioridad

### P1: Conectar primer proveedor (OWID) e implementar módulos de categorías eco

**Problema:** `apps/api/src/modules/` solo contiene `water-footprint` (dataset estático, ya con UI completa). Ninguna categoría consume datos de un proveedor externo y las 11 páginas de categoría restantes del frontend son placeholders (icono + título).

**Impacto:** Ninguna categoría consume datos de un proveedor externo; el BFF solo sirve el dataset estático de water-footprint y `/health`.

**Decisión de fuente:** OWID como primer proveedor (ver _Estrategia de Proveedores_). Corrección respecto a la versión anterior de este plan: se **reemplaza `air-quality` por `energy-sources`** en la primera tanda — air-quality en tiempo real no tiene opción comercial-safe sin key (Open-Meteo es no comercial), mientras que CO₂/temperatura/energía se cubren 100% con OWID.

**Base ya implementada:** la fundación de la capa de datos está lista en el BFF — tipos compartidos (`MetricSeries`, `MetricPoint`, `DataSourceAttribution`, `ApiResponse<T>.meta`), `OutboundHttpClient` (`apps/api/src/common/http/`) y `OwidClient` con cache en memoria (`apps/api/src/modules/providers/owid/`). Ver specs `api-data-layer` y `owid-provider-client`.

**Propuesta por fases** (cada fase = una propuesta OpenSpec independiente):

#### P1.0 — Primer módulo end-to-end: `co2-emissions`

La categoría con mejor relación datos/esfuerzo (OWID CO₂ dataset: anual, per cápita, sectorial, acumulado — ya validado en Postman).

- `Co2EmissionsModule` + controller: `GET /api/v1/co2-emissions/series?country=ARG&from=1990` (DTOs con `class-validator` para ISO-3166, rangos de años).
- Service que mapea OWID → `MetricSeries` con `DataSourceAttribution`.
- **Fallas del proveedor con status definido:** hoy `OwidClientError` no es una `HttpException`, así que el filtro global lo responde como `500` genérico. Definir el contrato — p. ej. `502` en formato `ApiResponse` cuando OWID falla o responde algo inválido — que reutilizarán P1.1/P1.2 e I08.
- Swagger tag + tests unitarios con fixtures (sin llamadas de red en tests).
- **Healthcheck de dependencias, fuera del startup probe:** instalar `@nestjs/terminus` y registrar un `HttpHealthIndicator` contra un endpoint liviano de OWID en un endpoint **separado** (p. ej. `GET /api/v1/health/dependencies`). `GET /api/v1/health` sigue siendo solo liveness: es el startup probe de Cloud Run (`deploy-api.yml`, timeout 2 s), así que si consultara a OWID, una caída de OWID impediría que arranquen instancias y rompería deploys — justo lo que I08 busca evitar.
- **Frontend:** la página `/co2-emissions/` deja de ser placeholder — Server Component con `fetch` al BFF e ISR (`revalidate: 86400`), Suspense boundary y primer gráfico de líneas con ECharts. Como con water-footprint, se excluye de `generateStaticParams` para que `next build` no dependa del BFF.
- **Base de charts (primera integración de ECharts),** según _Presentation Stack_ en `docs/design-system.md`: instalar `echarts` con versión exacta en `apps/web`; tokens `--chart-*` en `globals.css` con los valores documentados; adaptador de tema (tokens → tema de ECharts, re-aplicado al cambiar `.dark`), wrapper compartido y carga con `next/dynamic` + skeleton; config de Jest (transformar `echarts`/`zrender` e inyectar `measureText`). El guard `designTokens.test.ts` exige que cada token se use: el adaptador lee los tokens de chart por nombre, así que debe referenciarlos de forma que el test los reconozca (o el test suma una regla para ellos).
- **Patrón replicable en la web:** el helper genérico de fetch al BFF (`lib/bffFetch.ts`: reintentos ante cold start + validación de forma) ya existe. Falta un despacho por categoría — hoy `[category]/page.tsx` dispatcha con un `if` por water-footprint — para que P1.1/P1.2 solo agreguen piezas.
- **Atribución y fuentes:** la definición de atribución de OWID (`owid.attribution.ts`), el componente `SourceAttribution` y la página `/data-sources/` ya existen. El endpoint live de OWID solo necesita declarar a OWID como proveedor con `@DataSourceContributor()` (en el módulo del API) y mostrar `SourceAttribution` junto al gráfico.

#### P1.1 — `global-temperature` (OWID temperature anomaly) — replica el patrón de P1.0

#### P1.2 — `energy-sources` (OWID electricity generation by source + % renovables) — ídem

**Criterio de éxito de P1:** 3 categorías con datos reales comercial-safe en producción, healthcheck de dependencias externas (separado del liveness), patrón replicable documentado en AGENTS.md para las 9 categorías restantes.

**Dificultad:** P1.0: 5/10 (primera integración frontend con charts, ya sin la elección de librería ni la atribución) · P1.1/P1.2: 3/10 c/u (patrón ya establecido)
**Requisitos:**

- I08 conviene entre P1.0 y P1.1, cuando ya existe el contrato de error del proveedor y antes de multiplicar módulos.
- P2 instala `@nestjs/terminus` pero no refactoriza el healthcheck. **Cada módulo de P1 debe agregar su propio `HttpHealthIndicator` al endpoint de dependencias** para validar su API externa (OWID, NOAA, World Bank) — nunca al liveness que usa el startup probe. El primer módulo (P1.0) instala `@nestjs/terminus` directamente si se ejecuta antes que P2.
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
- **Healthcheck:** Instalar `@nestjs/terminus` (sin refactorizar el módulo actual — eso se hace en P1 cuando existan las APIs externas, en un endpoint de dependencias separado del liveness que usa el startup probe).

#### Frontend — `apps/web`

- **Error tracking:** `@sentry/nextjs` con `withSentryConfig()` wrapper en `next.config.ts`.
  - Proyecto Sentry dedicado: `eco-metrics-earth-web`.
  - Cobertura: Server Components, Client Components y Edge runtime.
  - `Sentry.ErrorBoundary` en el layout raíz para captura de errores de renderizado en cliente.
  - Source maps subidos automáticamente en build de Vercel (`SENTRY_AUTH_TOKEN`).
  - CSP actualizado: `connect-src` debe incluir `https://*.sentry.io`.
- **Sin librería de logging:** Vercel captura stdout/stderr del lado servidor; los errores de cliente van a Sentry. No se justifica Pino/Winston en el frontend.

#### CI/CD — ambos

- `SENTRY_DSN` en variables de entorno de Vercel y de los dos servicios de Cloud Run (uno por proyecto Sentry; `environment` = production / development para separar los eventos de `eco-metrics-api` y `eco-metrics-api-dev`).
- `SENTRY_AUTH_TOKEN` en secrets de CI/CD para subir source maps.

#### Alertas — configuración en Sentry (sin código)

- **1 alerta de error rate:** notificar por email cuando errores 5xx superen 3 por minuto.
- **1 alerta de healthcheck:** notificar cuando `/api/v1/health` falle más de 2 veces en 5 minutos.
- Canal: email (free tier incluido). Slack queda como opcional futuro.

#### Stack final

| Componente           | Tecnología                                      | Dónde                      |
| -------------------- | ----------------------------------------------- | -------------------------- |
| Logging estructurado | `nestjs-pino` + `pino-http`                     | `apps/api`                 |
| Error tracking front | `@sentry/nextjs`                                | `apps/web`                 |
| Error tracking back  | `@sentry/nestjs`                                | `apps/api`                 |
| Source maps upload   | `withSentryConfig` + `SENTRY_AUTH_TOKEN`        | CI/CD (Vercel + Cloud Run) |
| Healthcheck lib      | `@nestjs/terminus` (instalar, sin refactorizar) | `apps/api`                 |
| CSP Sentry           | `connect-src` → incluir `*.sentry.io`           | `next.config.ts`           |
| Alertas              | Email (error rate + healthcheck)                | Dashboard Sentry           |

**Fuera de P2 → backlog:**

- OpenTelemetry (I06): relevante cuando escalen los servicios o se quiera cambiar de backend de observabilidad sin tocar código de instrumentación.
- Axiom (I07): solo si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente.

**Dificultad:** 5/10 — mayoritariamente instalación de paquetes, configuración de env vars y wrapping de configs existentes. El punto más técnico es la integración de source maps en los pipelines de build.
**Requisitos:** Cuenta Sentry (free tier suficiente), `SENTRY_AUTH_TOKEN` en secrets de CI/CD.
**Estado:** Pendiente

---

## 📋 Plan de Acción Sugerido

Si no estás seguro por dónde empezar, este es el orden recomendado:

1. **P1.0: Módulo `co2-emissions` end-to-end** → Primera sección con datos reales + charts (Dificultad: 5/10)
2. **I08: Resiliencia del BFF ante proveedores externos** → Antes de multiplicar módulos
3. **P1.1 / P1.2: `global-temperature` y `energy-sources`** → Replicar el patrón (Dificultad: 3/10 c/u)
4. **I11: Evaluar TanStack Table vs tablas propias** → Antes del mapa, que trae la primera tabla país × año (Dificultad: 3/10)
5. **I10: Mapa coroplético (tabla + mapa)** → Vista por país sobre las tablas, iterable por categoría (Dificultad: 5/10)
6. **P2: Monitoreo y observabilidad** → Logs, métricas y error tracking (Dificultad: 5/10)

D1 (TypeScript 7) queda como seguimiento pasivo — sin acción por ahora.

---

## 🟠 Mantenimiento / Dependencias

> Seguimiento de dependencias que no se pueden actualizar todavía (majors bloqueadas o en evaluación).

### D1: Evaluación de TypeScript 7 (tsc nativo en Go)

Solo seguimiento — el salto 5.9 → 7.0 es un rewrite del compilador. No upgrade hasta validar compatibilidad con NX/Next/SWC y estabilidad del ecosistema.

**Estado:** Solo seguimiento

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

### 🟡 CI/CD

- **I09.** Construir la imagen Docker del API en CI sin publicarla (`docker build` sin push, idealmente con caché de capas y solo cuando cambian archivos que afectan al API, replicando la lista de rutas de `Detect api-affecting changes` de `deploy-api.yml`) — hoy el build de la imagen solo ocurre en el deploy (dev y prod), después del merge, así que una imagen base rota (p. ej. un PR de Dependabot) o un cambio en el `Dockerfile` o en las dependencias del API falla recién ahí y no en el PR. Aumenta el valor de los PRs semanales de Dependabot para `docker`. Dificultad: 3/10. Requiere: spec OpenSpec (toca `ci.yml`).

### 🟡 Testing

- **I01.** Tests de integración web→API con datos reales para las categorías eco — falta el equivalente a `water-footprint.spec.ts` (que ya arranca ambos servidores y valida contra datos reales del BFF) para el resto de las categorías cuando consuman datos de proveedores. Depende de P1.
- **I02.** Sin tests de accesibilidad unitarios con `jest-axe`. Los tests E2E con `@axe-core/playwright` ya auditan todas las páginas (a11y.spec.ts), lo que cubre el 80% del valor. La integración a nivel componente unitario es deseable pero no prioritaria — solo suma valor si crece mucho la cantidad de componentes.

### 🟢 Arquitectura / Deuda técnica

- **I03.** Sin capa de datos ni ORM — cuando empiece la integración real de datos, no hay TypeORM, Prisma ni esquema de base de datos definido.

### 🟢 Configuración / Build

- **I04.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.
- **I05.** Sin Storybook ni documentación visual de componentes. Actualmente hay 24 componentes (verificado al 16 Sep 2026), por lo que no se justifica el overhead de configuración y mantenimiento. Reconsiderar cuando supere ~40.

### 🟡 Datos / Proveedores

- **I08.** Resiliencia del BFF ante proveedores externos — hoy la web solo protege la llamada a nuestro BFF (2 intentos de 10 s + stale-if-error del ISR, change `water-footprint-cold-start-resilience`), lo que alcanza para el dataset propio de water footprint. Las próximas categorías dependen de proveedores externos (OWID, etc.) a través del BFF, y la caída de un tercero no debería romper una página ni bloquear un deploy. Propuesta: el BFF guarda la última respuesta buena de cada proveedor y, si el proveedor falla, la devuelve marcada como desactualizada (p. ej. `meta.stale` + `fetchedAt`) o responde un status/código acordado cuando no tiene datos; la web decide por sección qué mostrar (datos viejos o un aviso de "no disponible") sin fallar el build. Requiere caché persistente gratuito (Cloud Run escala a cero y pierde el caché en memoria): Cloud Storage o Firestore dentro del free tier, o un snapshot en la imagen. Conviene hacerlo entre P1.0 y P1.1: parte del contrato de error del proveedor que define P1.0.
- **I10.** Mapa coroplético mundial (tabla + mapa) — casi todas las categorías tienen datos país × año (OWID, World Bank, FAO), así que un mapa con tooltip por país suma una vista sobre la tabla, sin reemplazarla: la tabla/buscador queda como alternativa accesible (ECharts no da foco de teclado por país) y el mapa se itera por categoría. Con ECharts (serie `map` + `visualMap`): tooltip por hover, tap en mobile, zoom/arrastre y escala por clases con la paleta secuencial de `docs/design-system.md` (la divergente se define ahí cuando haga falta); la geometría se proyecta antes con `d3-geo`. Solo coroplético SVG por país — mapas de puntos o grilla (air-quality, ocean-health, endangered-species) quedan fuera. Pendientes en `docs/technical/libraries.md` (_Maps_): fuente de geometría, crosswalk ISO alfa-3 ↔ numérico, 110m vs 50m, geometría embebida vs servida como asset; más el filtrado de agregados OWID (`World`, `OWID_*`). Conviene después de P1.0. Dificultad: 5/10. Requiere: spec OpenSpec.
- **I11.** Evaluar TanStack Table vs tablas propias — `WaterFootprintTable` es markup propio (orden por 2 columnas + filtro por categoría) y hoy alcanza. La tabla/buscador país × año del mapa (~200 filas con búsqueda y orden), repetida por categoría, es donde una librería headless (~10–15 KB gz, sin estilos: el HTML y Tailwind siguen siendo propios) puede ahorrar lógica repetida. Spike desechable comparando ambas sobre esa tabla; candidatas y criterios en `docs/technical/libraries.md` (_Tables_). Antes de I10. Dificultad: 3/10. Requiere: spec OpenSpec si se adopta.

---

### 📝 Recordatorios

- **I06.** OpenTelemetry — considerado para el futuro cuando el sistema escale a múltiples servicios o se quiera cambiar de backend de observabilidad (Sentry → Datadog, Honeycomb, etc.) sin tocar código de instrumentación. Con un solo BFF, Sentry Performance cubre el tracing necesario. No justifica el overhead de configuración actual (collector, exporters, SDK setup).
- **I07.** Axiom — plataforma de logs como servicio. Solo relevante si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente para debugging post-mortem. Por ahora los logs agregados de cada plataforma son suficientes.
- **I12.** Reevaluar un subagente `designer` — se descartó porque solo haría "leer `docs/design-system.md` y aplicarlo", que ya hace `@coder` (ver _Tooling note_ en ese doc). Reconsiderarlo solo si el doc deja de ser barato de leer entero (recetas por tipo de chart, inventario de componentes, después de P1.0–P1.2) y hay evidencia de algo que `@coder` + `@reviewer` con el doc no cubran. Baja prioridad; si no se justifica, no se hace.

**Última actualización:** 24 Oct 2026
