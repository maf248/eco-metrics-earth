# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (16 Sep 2026)

| Aspecto          | Estado | Nota                                                                                                                                                                                                                   |
| ---------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests            | ✅     | 331 unit (267 web + 56 api + 8 shared) + 61 E2E pasando, 0 errores                                                                                                                                                     |
| Lint             | ✅     | Sin warnings                                                                                                                                                                                                           |
| Build            | ✅     | Compila correctamente                                                                                                                                                                                                  |
| CI               | ✅     | CI en PRs y push a cualquier branch                                                                                                                                                                                    |
| CD / Deploy      | ✅     | web: Vercel (auto-deploy desde GitHub); api: Cloud Run (workflow `deploy-api.yml` desde `develop`, servicio `eco-metrics-api`, `eco-metrics-api-fexi2yqv2q-uc.a.run.app`); gap de staging/preview del api sigue en I02 |
| Dependencias     | 🟡     | `npm audit`: 19 vulns (0 critical, 15 high, 3 moderate, 1 low). Todas viven en el subtree bundleado de `semantic-release`. Restante: tooling de release (D1). Ver I01                                                  |
| Coverage         | ✅     | Medido con Jest                                                                                                                                                                                                        |
| E2E              | ✅     | Playwright: 61 tests en 7 specs, 5 browsers, CI integrado, arranque determinista (readiness de ambos puertos)                                                                                                          |
| Theming          | ✅     | Light/dark mode con toggle, persistencia (localStorage) y zero-flash (spec `theme-toggle` + `theme-system`)                                                                                                            |
| Monitoreo        | ❌     | No implementado                                                                                                                                                                                                        |
| **Datos reales** | 🟡     | **Ningún proveedor externo conectado** — water-footprint completa (dataset estático + UI + tests E2E con datos reales); las 11 páginas restantes siguen como placeholders (ver Estrategia de Proveedores + P1)         |

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

**Impacto:** El BFF solo sirve `/health`, no hay datos reales.

**Decisión de fuente:** OWID como primer proveedor (ver _Estrategia de Proveedores_). Corrección respecto a la versión anterior de este plan: se **reemplaza `air-quality` por `energy-sources`** en la primera tanda — air-quality en tiempo real no tiene opción comercial-safe sin key (Open-Meteo es no comercial), mientras que CO₂/temperatura/energía se cubren 100% con OWID.

**Propuesta por fases** (cada fase = una propuesta OpenSpec independiente):

#### P1.0 — Fundación de la capa de datos (prerequisito de todo lo demás)

1. **Tipos compartidos** en `packages/shared`: `MetricSeries` (puntos año/valor por entidad), `MetricPoint`, `DataSourceAttribution` (provider, license, sourceUrl, lastUpdated) — la atribución viaja en `ApiResponse<T>.meta` (ver I14).
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
- **Frontend:** la página `/co2-emissions/` deja de ser placeholder — Server Component con `fetch` al BFF e ISR (`revalidate: 86400`), Suspense boundary (resuelve I09 para esta ruta) y primer gráfico de líneas (requiere decidir librería de charts, ver I15; al integrarla aplica el recordatorio de `next/dynamic`).
- **Atribución visible** "Data: Our World in Data (CC BY)" (ver I13 — requisito legal de la licencia).

#### P1.2 — `global-temperature` (OWID temperature anomaly) — replica el patrón de P1.1

#### P1.3 — `energy-sources` (OWID electricity generation by source + % renovables) — ídem

**Criterio de éxito de P1:** 3 categorías con datos reales comercial-safe en producción, healthcheck agregando dependencias externas, patrón replicable documentado en AGENTS.md para las 9 categorías restantes.

**Dificultad:** P1.0: 5/10 · P1.1: 6/10 (incluye la primera integración frontend + charts) · P1.2/P1.3: 3/10 c/u (patrón ya establecido)
**Requisitos:**

- P2 instala `@nestjs/terminus` pero no refactoriza el healthcheck. **Cada módulo de P1 debe agregar su propio `HttpHealthIndicator` al `HealthModule`** para validar su API externa (OWID, NOAA, World Bank). Esto convierte el healthcheck en un agregado real de dependencias externas. P1.0 puede instalar `@nestjs/terminus` directamente si se ejecuta antes que P2.
- I03 (CORS multi-origen) pasa a ser bloqueante cuando el frontend en Vercel consuma el BFF en Cloud Run — resolverlo dentro de P1.1 o antes del deploy del back.
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

- OpenTelemetry (I10): relevante cuando escalen los servicios o se quiera cambiar de backend de observabilidad sin tocar código de instrumentación.
- Axiom (I11): solo si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente.

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

D2 (TypeScript 7) queda como seguimiento pasivo — sin acción por ahora.

---

## 🟠 Mantenimiento / Dependencias (Sep 2026)

> Hallazgos de la revisión del 10 Sep 2026: drift de dependencias (~2 meses), `npm audit` en 80 vulnerabilidades y docs desincronizados tras el trabajo de water-footprint.

### D1: Tooling de release — majors de bajo riesgo

semantic-release 25, @commitlint 21, lint-staged 17, concurrently 10, @semantic-release/changelog 7, @semantic-release/git 11, conventional-changelog-conventionalcommits 10. Riesgo acotado a CI. semantic-release 25 limpia los ~19 advisories del subtree bundleado de npm (ver I01).

**Dificultad:** 3/10 · **Estado:** Pendiente

### D2: Evaluación de TypeScript 7 (tsc nativo en Go)

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

### 🔴 Seguridad

- **I01.** `npm audit` reporta 19 vulnerabilidades (0 critical, 15 high, 3 moderate, 1 low — verificado al 16 Sep 2026). **Todas** viven dentro del tarball bundleado de `npm@10.9.9`, que llega por `semantic-release` → `@semantic-release/npm` (`@sigstore/*`, `brace-expansion`, `ip-address`, `picomatch`, `postcss-selector-parser`, `@npmcli/*`/`libnpm*`). Son **inalcanzables para `npm audit fix`** por estar bundleadas. **Fix:** subir a semantic-release 25 — es el D1.

### 🟡 CI/CD

- **I02.** Staging parcial — Vercel genera preview deploys automáticos desde `develop`, lo que funciona como staging de facto para el frontend. Cloud Run no tiene equivalente a PR previews; los previews de Vercel consumen el BFF productivo (trade-off staging-is-production aceptado por ahora).

### 🟡 API / Seguridad

- **I03.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único en `AppConfigService`. Cuando web (Vercel preview + prod) y API (Cloud Run) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo). Migrar a lista separada por comas (o regex para previews de Vercel). **Bloqueante para P1.1** cuando el frontend desplegado consuma el BFF.

### 🟡 Testing

- **I04.** Tests de integración web→API con datos reales para las categorías eco — falta el equivalente a `water-footprint.spec.ts` (que ya arranca ambos servidores y valida contra datos reales del BFF) para el resto de las categorías cuando consuman datos de proveedores. Depende de P1.
- **I05.** Sin tests de accesibilidad unitarios con `jest-axe`. Los tests E2E con `@axe-core/playwright` ya auditan todas las páginas (a11y.spec.ts), lo que cubre el 80% del valor. La integración a nivel componente unitario es deseable pero no prioritaria — solo suma valor si crece mucho la cantidad de componentes.

### 🟢 Arquitectura / Deuda técnica

- **I09.** Sin Suspense boundaries — el App Router de Next.js está diseñado alrededor de Suspense + streaming para manejar estados de carga y errores. Actualmente las páginas renderizan sincrónicamente sin límites de Suspense, lo que bloquea el main thread durante transiciones de ruta. Requisito previo para P1 (data fetching real).
- **I16.** Higiene de los specs canónicos en `openspec/specs/` — pendiente, todo tarea de criterio y no mecánica (verificado al 16 Sep 2026): (a) **30 de 42** specs tienen el `## Purpose` en el placeholder autogenerado `TBD - created by archiving change <x>` — hay que escribir una línea real por capability; (b) `ci-node-version` usa un esquema propio (`# Spec: ...` + `## Capability`) ajeno a la gramática de OpenSpec; (c) `api-app-scaffold` no tiene título ni `## Purpose`; (d) 3 specs están en español (`api-app-scaffold`, `shared-types`, `web-app-scaffold`), violando la regla de inglés de `CLAUDE.md`. Es deuda de documentación: no afecta al código ni al sitio. **Causa de fondo:** el CLI de `openspec` no está instalado (no está en `package.json` ni en `node_modules/.bin`), así que el archivado y el merge de deltas se hacen a mano, sin nada que valide la gramática. La regla documentada en `AGENTS.md` mitiga el síntoma, no la causa. **Sugerencia:** evaluar instalarlo como devDependency y usar `openspec archive` / `validate` en vez del `mv` + merge manual, sumándolo al pre-commit. Decidir primero si soporta el layout actual antes de migrar los 42 specs.
- **I06.** Sin capa de datos ni ORM — cuando empiece la integración real de datos, no hay TypeORM, Prisma ni esquema de base de datos definido.

### 🟢 Configuración / Build

- **I07.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.
- **I08.** Sin Storybook ni documentación visual de componentes. Actualmente hay 24 componentes (verificado al 16 Sep 2026), por lo que no se justifica el overhead de configuración y mantenimiento. Reconsiderar cuando supere ~40.

### 🟢 UI / Diseño

- **I12.** Visibilidad de iconos SVG en modo claro/oscuro — algunos iconos de categoría (sobre todo reforestation, ocean-health, plastic-pollution) no contrastan con el fondo en modo claro: se pierden detalles y bordes. En oscuro el problema es menor pero persiste. Accionable: light/dark ya está en producción.

  **Restricción dura** (decisión registrada en el spec `light-mode-styling`): los iconos son **intencionalmente multicolor** — sus colores son identidad de cada categoría y no se recolorean ni tintan por tema. El fix mejora **separación**, no color: drop-shadow/glow, borde o contenedor, o background highlight detrás del icono.

  **Descartado:** invertir/tintar los colores del SVG según tema, o iconos con prop `theme` que ajusten fill/stroke — contradice la decisión anterior.

  **Dificultad:** 3/10 — CSS/Tailwind y ajuste visual. **Estado:** Pendiente

### 🟡 Datos / Proveedores

- **I13.** Atribución de datos (requisito legal, no opcional) — CC BY exige atribución visible. Antes de publicar la primera sección con datos reales (P1.1): componente de atribución al pie de cada visualización ("Data: Our World in Data — CC BY" con link) + página `/data-sources/` listando proveedores y licencias. Alimentado por el `DataSourceAttribution` de I14. Bonus SEO: contenido indexable con estructura.
- **I14.** Extender `ApiResponse<T>` con metadata de fuente — el contrato actual no transporta procedencia. Agregar `meta: { source: DataSourceAttribution; fetchedAt: string }` para que el frontend renderice atribución y frescura sin hardcodear nada por página. Diseñarlo en P1.0 para no romper el contrato después.
- **I15.** Elegir librería de charts — pendiente. Cuando toque (antes de P1.1), ver `docs/technical/libraries.md`: tiene candidatas, descartadas con motivo, spikes por candidata y los gates a cumplir. La decisión se registra en `docs/design-system.md` y activa el recordatorio de Dynamic Imports.

---

### 📝 Recordatorios

- **Dynamic Imports (`next/dynamic`)** — No implementar todavía. Los chunks actuales pesan ~1KB por página, y dynamic imports agregarían complejidad (loading states por import, layout shift) sin beneficio real hoy. Reconsiderar cuando se integren librerías pesadas como charting libraries (d3, echarts) o widgets de terceros.

- **I10.** OpenTelemetry — considerado para el futuro cuando el sistema escale a múltiples servicios o se quiera cambiar de backend de observabilidad (Sentry → Datadog, Honeycomb, etc.) sin tocar código de instrumentación. Con un solo BFF, Sentry Performance cubre el tracing necesario. No justifica el overhead de configuración actual (collector, exporters, SDK setup).
- **I11.** Axiom — plataforma de logs como servicio. Solo relevante si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente para debugging post-mortem. Por ahora los logs agregados de cada plataforma son suficientes.

**Última actualización:** 16 Sep 2026
