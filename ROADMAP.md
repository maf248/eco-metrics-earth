# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (23 May 2026)

| Aspecto | Estado | Nota |
|---------|--------|------|
| Tests | ✅ | 194 unit + 63 E2E = 257 tests pasando, 0 errores |
| Lint | ✅ | Sin warnings |
| Build | ✅ | Compila correctamente |
| CI | ✅ | CI en PRs y push a cualquier branch |
| CD / Deploy | 🟡 | No hay entornos de pre-release/staging (ver I02) |
| Dependencias | ✅ | Al día (Fase 1 + Fase 2 aplicadas) |
| Coverage | ✅ | Medido con Jest |
| E2E | ✅ | Playwright: 63 tests, 5 browsers, CI integrado |
| Monitoreo | ❌ | No implementado |

---

## 🔴 Crítico / Alta Prioridad

### P1: Implementar módulos de categorías eco (API)

**Problema:** `apps/api/src/modules/` solo tiene `.gitkeep`. No hay lógica real para ninguna categoría.

**Impacto:** El BFF solo sirve `/health`, no hay datos reales.

**Propuesta:** Implementar módulos NestJS para al menos 3 categorías:
- `air-quality` — Air Quality Index (AQI) por ciudad
- `co2-emissions` — Emisiones globales de CO₂
- `global-temperature` — Temperatura global promedio

Cada módulo debe incluir:
- Controller con GET endpoint
- Service con datos mock o integración con API externa (ej: OpenWeatherMap, Climate Data API)
- DTOs con validación (`class-validator`)
- Tests unitarios

**Dificultad:** 6/10
**Requisitos:**
- Definir fuentes de datos (mock vs API real).
- P2 instala `@nestjs/terminus` pero no refactoriza el healthcheck. **Cada módulo de P1 debe agregar su propio `HttpHealthIndicator` al `HealthModule`** para validar su API externa (NOAA, Open-Meteo, World Bank, OWID). Esto convierte el healthcheck en un agregado real de dependencias externas.
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

1. **P1: Implementar módulos eco** → Funcionalidad real (Dificultad: 6/10)
2. **P2: Monitoreo y observabilidad** → Logs, métricas y error tracking (Dificultad: 5/10)

---

## 🟡 CI/CD / Deploy

### P4: CI/CD con deploy condicional — Vercel (web) + Railway (api)

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

- **I03.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único en `AppConfigService`. Cuando web (Vercel preview + prod) y API (Railway) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo). También deberá incluir la URL de Railway (`https://eco-metrics-earth-api.railway.app`) cuando se despliegue el back. Cuando web (Vercel preview + prod) y API (Railway) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo).

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

- **I12.** Visibilidad de iconos SVG en modo claro/oscuro — algunos iconos de categoría (especialmente reforestation, ocean-health, plastic-pollution) no contrastan bien con el fondo en modo claro: se pierden detalles o bordes por falta de separación visual. En modo oscuro el problema es menor pero persiste en detalles finos.

**Propuesta:** Evaluar alternativas para mejorar contraste y legibilidad de los iconos en ambos temas:
- **Drop shadow / glow** sutil alrededor de los paths (ej: filter: drop-shadow() en SVG o un contenedor wrapper).
- **Border o stroke** exterior en los iconos (ej: contenedor circular o card con borde sutil).
- **Ajuste de colores del SVG** — verificar si el diseño original de los assets tiene variantes para fondo claro, o si los colores deben invertirse/tintarse dinámicamente según prefers-color-scheme.
- **Background highlight** — un fondo semi-transparente o gradiente sutil detrás del icono para separarlo del fondo de la página.
- **Alternativa:** reemplazar los iconos SVG inline por componentes que acepten una prop theme y ajusten fill/stroke en consecuencia.

**Dificultad:** 3/10 — mayoritariamente CSS/Tailwind y ajuste visual.
**Estado:** Pendiente
---
### 📝 Recordatorios

- **Dynamic Imports (`next/dynamic`)** — No implementar todavía. Los chunks actuales pesan ~1KB por página, y dynamic imports agregarían complejidad (loading states por import, layout shift) sin beneficio real hoy. Reconsiderar cuando se integren librerías pesadas como charting libraries (d3, echarts) o widgets de terceros.

- **I10.** OpenTelemetry — considerado para el futuro cuando el sistema escale a múltiples servicios o se quiera cambiar de backend de observabilidad (Sentry → Datadog, Honeycomb, etc.) sin tocar código de instrumentación. Con un solo BFF, Sentry Performance cubre el tracing necesario. No justifica el overhead de configuración actual (collector, exporters, SDK setup).
- **I11.** Axiom — plataforma de logs como servicio. Solo relevante si la retención de logs de Railway (7 días) o Vercel resulta insuficiente para debugging post-mortem. Por ahora los logs agregados de cada plataforma son suficientes.

**Última actualización:** 06 Jun 2026
