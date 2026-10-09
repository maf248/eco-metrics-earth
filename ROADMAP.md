# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (8 Oct 2026)

| Aspecto          | Estado | Nota                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests            | ✅     | 572 unit (314 web + 233 api + 25 shared) + 280 instancias E2E (5 browsers) pasando, 0 errores                                                                                                                                                                                                                                                                                                                                                             |
| Lint             | ✅     | Sin warnings                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Build            | ✅     | Compila correctamente                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CI               | ✅     | CI en PRs y push a cualquier branch (`permissions` mínimos; `concurrency` a nivel job que cancela corridas reemplazadas sin cortar deploys); guardia de lockfile podado del API (`api:prune` + `npm ci --dry-run`); el nombre del job es contrato con Vercel Deployment Checks                                                                                                                                                                            |
| CD / Deploy      | ✅     | web: Vercel (auto-deploy desde GitHub; producción retenida por Deployment Check hasta CI verde, commits de release salteados); api: Cloud Run (`deploy-api.yml` reutilizable llamado desde CI con `needs` en push a `develop`, detección de cambios contra el SHA desplegado, imagen reproducible con `npm ci` desde lockfile podado; servicio `eco-metrics-api`, `eco-metrics-api-fexi2yqv2q-uc.a.run.app`); gap de staging/preview del api sigue en I01 |
| Dependencias     | 🟡     | 11 advisories, todas en tooling de desarrollo (`npm ls --omit=dev` vacío — nada llega a producción): 4 viven en el `npm@11.20.0` empaquetado por `semantic-release` (sin fix hasta un 11.x parcheado → `npm update npm`) y el resto es la cadena `braces`/`micromatch` (sin versión parcheada publicada). `axios` y `brace-expansion@5` (pins exactos de `nx`) se fuerzan vía `overrides`.                                                                |
| Coverage         | ✅     | Medido con Jest                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| E2E              | ✅     | Playwright: 70 tests en 8 specs, 5 browsers, CI integrado, arranque determinista (readiness de ambos puertos)                                                                                                                                                                                                                                                                                                                                             |
| Theming          | ✅     | Light/dark mode con toggle, persistencia (localStorage) y zero-flash (spec `theme-toggle` + `theme-system`)                                                                                                                                                                                                                                                                                                                                               |
| Monitoreo        | ❌     | No implementado                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Datos reales** | 🟡     | **Ningún proveedor externo expuesto todavía** (cliente OWID + cache listos en el BFF, sin endpoints) — water-footprint completa (dataset estático + UI + tests E2E con datos reales); las 11 páginas restantes siguen como placeholders (ver Estrategia de Proveedores + P1)                                                                                                                                                                              |

---

## 🌐 Estrategia de Proveedores de Datos

> Prioridad del proyecto: conectar primero un proveedor **libre para uso comercial** que popule la mayor cantidad de secciones posible, partiendo de las colecciones de Postman ya validadas en `postman/`.

### Decisión recomendada: OWID como primer proveedor

**Our World in Data (OWID)** es el primer proveedor a conectar. Justificación:

- **Licencia CC BY** — uso comercial y con publicidad permitido, solo requiere atribución (ver I09).
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
- Swagger tag + tests unitarios con fixtures (sin llamadas de red en tests).
- **Health indicator**: instalar `@nestjs/terminus` y registrar un `HttpHealthIndicator` contra un endpoint liviano de OWID en `HealthModule`. Esto agrega OWID como dependencia real del healthcheck, seguro porque este módulo ya expone endpoints que consumen OWID (se difirió de la fundación porque el startup probe de Cloud Run usa `GET /api/v1/health`).
- **Frontend:** la página `/co2-emissions/` deja de ser placeholder — Server Component con `fetch` al BFF e ISR (`revalidate: 86400`), Suspense boundary y primer gráfico de líneas (requiere decidir librería de charts, ver I10; al integrarla aplica el recordatorio de `next/dynamic`).
- **Atribución visible** "Data: Our World in Data (CC BY)" (ver I09 — requisito legal de la licencia).

#### P1.1 — `global-temperature` (OWID temperature anomaly) — replica el patrón de P1.0

#### P1.2 — `energy-sources` (OWID electricity generation by source + % renovables) — ídem

**Criterio de éxito de P1:** 3 categorías con datos reales comercial-safe en producción, healthcheck agregando dependencias externas, patrón replicable documentado en AGENTS.md para las 9 categorías restantes.

**Dificultad:** P1.0: 6/10 (incluye la primera integración frontend + charts) · P1.1/P1.2: 3/10 c/u (patrón ya establecido)
**Requisitos:**

- P2 instala `@nestjs/terminus` pero no refactoriza el healthcheck. **Cada módulo de P1 debe agregar su propio `HttpHealthIndicator` al `HealthModule`** para validar su API externa (OWID, NOAA, World Bank). Esto convierte el healthcheck en un agregado real de dependencias externas. El primer módulo (P1.0) instala `@nestjs/terminus` directamente si se ejecuta antes que P2.
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

- `SENTRY_DSN` en variables de entorno de Vercel y Cloud Run (uno por proyecto Sentry).
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

- OpenTelemetry (I07): relevante cuando escalen los servicios o se quiera cambiar de backend de observabilidad sin tocar código de instrumentación.
- Axiom (I08): solo si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente.

**Dificultad:** 5/10 — mayoritariamente instalación de paquetes, configuración de env vars y wrapping de configs existentes. El punto más técnico es la integración de source maps en los pipelines de build.
**Requisitos:** Cuenta Sentry (free tier suficiente), `SENTRY_AUTH_TOKEN` en secrets de CI/CD.
**Estado:** Pendiente

---

## 📋 Plan de Acción Sugerido

Si no estás seguro por dónde empezar, este es el orden recomendado:

1. **P1.0: Módulo `co2-emissions` end-to-end** → Primera sección con datos reales + charts (Dificultad: 6/10)
2. **P1.1 / P1.2: `global-temperature` y `energy-sources`** → Replicar el patrón (Dificultad: 3/10 c/u)
3. **P2: Monitoreo y observabilidad** → Logs, métricas y error tracking (Dificultad: 5/10)

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

- **I01.** Staging parcial — Vercel genera preview deploys automáticos desde `develop`, lo que funciona como staging de facto para el frontend. Cloud Run no tiene equivalente a PR previews; los previews de Vercel consumen el BFF productivo (trade-off staging-is-production aceptado por ahora; solución planificada en I11).

- **I11.** Backend de desarrollo en Cloud Run — segundo servicio `eco-metrics-api-dev` deployado desde `develop` (el productivo `eco-metrics-api` pasa a deployar desde `main`), consumido por el entorno Preview de Vercel (`API_BASE_URL` de Preview → URL del servicio dev). Resuelve el trade-off staging-is-production del back (I01) sin costo extra: el always-free tier de Cloud Run (2M req/mes, 180k vCPU-s, 360k GiB-s) se comparte por cuenta de billing y ambos servicios escalan a cero. Reutiliza WIF + `github-deployer` existentes (`roles/run.admin` ya cubre deployar un segundo servicio en el mismo proyecto). Requiere: propuesta OpenSpec sobre `api-cloud-run-deploy` (el workflow `deploy-api.yml` pasa a dos entornos con triggers distintos), variables GitHub nuevas para el servicio dev (URL/origins CORS) y cleanup policy de Artifact Registry para el churn extra de imágenes. Compatibilidad con el gate de CI de deploys (change `gate-deploys-on-ci`): el deploy ya es un workflow reutilizable llamado desde `ci.yml` con `needs: ci`; para dos entornos, el job llamador se duplica (o usa matriz) con `main` → `eco-metrics-api` y `develop` → `eco-metrics-api-dev`, el nombre del servicio (hoy `SERVICE` en el `env` del workflow) pasa a ser input del workflow reutilizable y el grupo de concurrencia (hoy el literal `deploy-api`) pasa a ser por servicio.

- **I14.** Pinear la imagen base `node:24-alpine` por digest y agregar Dependabot para `docker` y `github-actions` — hoy la imagen base es flotante, lo que mantiene los parches de seguridad de SO y Node pero hace los builds no reproducibles a nivel de base. Un digest sin actualizador automático congelaría esos parches, por eso ambas cosas van juntas (Dependabot propone la actualización del digest y de las versiones de las actions). Dificultad: 2/10. Requiere: spec OpenSpec corta (toca el `Dockerfile` y `.github/dependabot.yml`).

### 🟡 Testing

- **I02.** Tests de integración web→API con datos reales para las categorías eco — falta el equivalente a `water-footprint.spec.ts` (que ya arranca ambos servidores y valida contra datos reales del BFF) para el resto de las categorías cuando consuman datos de proveedores. Depende de P1.
- **I03.** Sin tests de accesibilidad unitarios con `jest-axe`. Los tests E2E con `@axe-core/playwright` ya auditan todas las páginas (a11y.spec.ts), lo que cubre el 80% del valor. La integración a nivel componente unitario es deseable pero no prioritaria — solo suma valor si crece mucho la cantidad de componentes.

### 🟢 Arquitectura / Deuda técnica

- **I04.** Sin capa de datos ni ORM — cuando empiece la integración real de datos, no hay TypeORM, Prisma ni esquema de base de datos definido.
- **I12.** Endpoints de scaffold expuestos en producción — `GET/POST /api/v1/demo-validation` (`DemoValidationController`, marcado `@deprecated` "will be removed when real eco modules are implemented") y `GET /api/v1/` ("Hello API") siguen públicos en Cloud Run. Propuesta: eliminar `DemoValidationController`, `AppController`/`AppService` y los DTOs que solo usan ellos (`create-metric.dto.ts`, `get-metrics-query.dto.ts`) con sus tests; mover los E2E de validación de `e2e/api-health.spec.ts` a `water-footprint/products?category=<inválida>` (400 en formato `ApiResponse`) y mover `e2e/rate-limit.spec.ts` (hoy usa `GET /demo-validation`) a un endpoint real; actualizar tablas de endpoints (`README.md`, `apps/api/README.md`) y tags de Swagger. Requiere spec (cambia la superficie pública del API). Puede hacerse junto con P1.0, cuando exista el primer endpoint real con DTOs.

### 🟢 Configuración / Build

- **I05.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.
- **I06.** Sin Storybook ni documentación visual de componentes. Actualmente hay 24 componentes (verificado al 16 Sep 2026), por lo que no se justifica el overhead de configuración y mantenimiento. Reconsiderar cuando supere ~40.

### 🟢 SEO / Metadatos

- **I13.** Títulos, descripciones e imagen social optimizados para buscadores y redes — un inspector de meta-tags sobre la home marca 3 advertencias, validadas contra el código (8 Oct 2026):
  - **Título corto:** el título de la home es solo la marca, `eco-metrics earth` (17 caracteres, `apps/web/src/app/page.tsx`). Recomendado: 50–60 caracteres, con palabras clave que digan de qué trata el sitio (p. ej. CO2, clima, energía, agua) además de la marca.
  - **Descripción corta:** `Track and visualize environmental metrics for a sustainable planet.` (67 caracteres), repetida en `layout.tsx`, `page.tsx` y la imagen social. Recomendado: 120–160 caracteres.
  - **Imagen social sin llamada a la acción:** `src/app/og-image.png/route.tsx` muestra solo logo, marca y tagline. Agregar un CTA sutil (p. ej. "Explore the data →"). Es una heurística de marketing, no de SEO, pero es barata y mejora los links compartidos.
  - **Categorías (no lo detecta la herramienta, que solo miró la home):** las 12 páginas tienen títulos de 31–38 caracteres (`Air Quality — eco-metrics earth`) y descripciones generadas desde una única plantilla (`Track and visualize <x> metrics for a sustainable planet.`, ~70 caracteres); Google tiende a ignorar descripciones casi idénticas entre páginas. Escribir título y descripción únicos por categoría. 11 de las 12 todavía son placeholders: el texto debe ser honesto sobre lo que la sección ofrece hoy y ajustarse cuando cada una reciba datos reales (P1).
  - **Requiere spec:** el spec canónico `water-footprint-page` ("SEO preservation on the water-footprint page") fija textualmente la descripción actual, así que cambiarla es un MODIFIED de ese requisito. Mantener la tagline de la imagen social alineada con la descripción del sitio, actualizar los tests que fijen esos textos y validar el resultado con el mismo inspector.

### 🟡 Datos / Proveedores

- **I09.** Atribución de datos (requisito legal, no opcional) — CC BY exige atribución visible. Antes de publicar la primera sección con datos reales (P1.0): componente de atribución al pie de cada visualización ("Data: Our World in Data — CC BY" con link) + página `/data-sources/` listando proveedores y licencias. Alimentado por `ApiResponse<T>.meta.source` (`DataSourceAttribution`, ya disponible en `@eco-metrics/shared`). Bonus SEO: contenido indexable con estructura.
- **I10.** Elegir librería de charts — pendiente. Cuando toque (antes de P1.0), ver `docs/technical/libraries.md`: tiene candidatas, descartadas con motivo, spikes por candidata y los gates a cumplir. La decisión se registra en `docs/design-system.md` y activa el recordatorio de Dynamic Imports.

---

### 📝 Recordatorios

- **Dynamic Imports (`next/dynamic`)** — No implementar todavía. Los chunks actuales pesan ~1KB por página, y dynamic imports agregarían complejidad (loading states por import, layout shift) sin beneficio real hoy. Reconsiderar cuando se integren librerías pesadas como charting libraries (d3, echarts) o widgets de terceros.

- **I07.** OpenTelemetry — considerado para el futuro cuando el sistema escale a múltiples servicios o se quiera cambiar de backend de observabilidad (Sentry → Datadog, Honeycomb, etc.) sin tocar código de instrumentación. Con un solo BFF, Sentry Performance cubre el tracing necesario. No justifica el overhead de configuración actual (collector, exporters, SDK setup).
- **I08.** Axiom — plataforma de logs como servicio. Solo relevante si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente para debugging post-mortem. Por ahora los logs agregados de cada plataforma son suficientes.

**Última actualización:** 9 Oct 2026
