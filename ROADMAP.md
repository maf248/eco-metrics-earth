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
**Requisitos:** Definir fuentes de datos (mock vs API real)
**Estado:** Pendiente

---

## 🟡 Importante / Media Prioridad

### P2: Monitoreo y observabilidad

**Problema:** No hay logs estructurados, métricas ni error tracking.

**Impacto:** En producción será difícil debuggear problemas.

**Propuesta:** Implementar:
- **Logging estructurado:** Winston o Pino en NestJS
- **Error tracking:** Sentry (frontend + backend)
- **Healthcheck robusto:** validar dependencias externas (APIs, DB cuando exista)
- **Métricas:** considerar OpenTelemetry para el futuro

**Dificultad:** 7/10
**Requisitos:** Cuenta Sentry (free tier disponible)
**Estado:** Pendiente

---

## 🟢 Mejoras / Baja Prioridad

### P3: Storybook para componentes

**Problema:** Los 16 componentes React no tienen documentación visual ni tests de interacción aislados.

**Propuesta:** Integrar Storybook:
- Documentar componentes en aislamiento
- Tests de interacción con play functions
- Accessibility tests

**Dificultad:** 6/10
**Requisitos:** Decisión de configuración (Webpack vs Vite)
**Estado:** Pendiente

---

## 📋 Plan de Acción Sugerido

Si no estás seguro por dónde empezar, este es el orden recomendado:

1. **P1: Implementar módulos eco** → Funcionalidad real (Dificultad: 6/10)
2. **P2: Monitoreo y observabilidad** → Logs, métricas y error tracking (Dificultad: 7/10)
3. **P3: Storybook** → Documentación visual de componentes (Dificultad: 6/10)
4. **P4: CI/CD con deploy condicional** → Deploy automático Vercel + Railway (Dificultad: 4/10)

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
**Estado:** Pendiente

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

- **I02.** No hay estrategia de pre-release o staging — todos los deploys (Vercel, Railway) van directo a producción desde `main`. No hay preview deploys desde `develop` ni entorno de pruebas separado. Solución pragmática: inicialmente solo prod por simplicidad; agregar staging cuando el sitio tenga tráfico mínimo y se justifique el costo/beneficio.

### 🟡 API / Seguridad

- **I03.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único en `AppConfigService`. Cuando web (Vercel preview + prod) y API (Railway) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo). También deberá incluir la URL de Railway (`https://eco-metrics-earth-api.railway.app`) cuando se despliegue el back. Cuando web (Vercel preview + prod) y API (Railway) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo).

### 🟡 Testing

- **I04.** Sin tests de integración web→API con datos reales. Los tests E2E (`api-health.spec.ts`) verifican health + errores + CORS, pero falta integración con datos de categorías eco (depende de P1).
- **I05.** Sin tests de accesibilidad unitarios con `jest-axe`. Los tests E2E con `@axe-core/playwright` ya auditan todas las páginas (a11y.spec.ts), pero falta integración a nivel componente unitario.

### 🟢 Arquitectura / Deuda técnica

- **I06.** Sin capa de datos ni ORM — cuando empiece la integración real de datos (P2), no hay TypeORM, Prisma ni esquema de base de datos definido.

### 🟢 Configuración / Build

- **I07.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.

---

**Última actualización:** 23 May 2026
