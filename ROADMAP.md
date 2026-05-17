# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (17 May 2026)

| Aspecto | Estado | Nota |
|---------|--------|------|
| Tests | ✅ | 162 tests pasando, 0 errores |
| Lint | ✅ | Sin warnings |
| Build | ✅ | Compila correctamente |
| CI/CD | ⚠️ | Solo release, falta CI en PRs |
| Dependencias | ✅ | Al día (Fase 1 + Fase 2 aplicadas) |
| Coverage | ✅ | Medido con Jest |
| E2E | ❌ | No implementado |
| Monitoreo | ❌ | No implementado |

---

## 🔴 Crítico / Alta Prioridad

### P1: CI/CD — Workflow de validación en PRs

**Problema:** Solo existe `release.yml` que corre en `main`. No hay validación automática en Pull Requests ni en branches de feature.

**Impacto:** Los errores pueden llegar a `main` sin ser detectados.

**Propuesta:** Crear `.github/workflows/ci.yml` que ejecute:
- `npm run lint`
- `npm run build`
- `npm run test`

**Diseño:**
- **Triggers:** `push` a cualquier branch que no sea `main` + `pull_request` hacia `main` — así el autor ve el fallo antes de abrir el PR
- **Cache:** `actions/cache` para `node_modules` — los `npm ci` sin cache son lentos; el `release.yml` actual tampoco cachea, buen momento para mejorarlo en paralelo
- **Matrix de Node versions:** opcional por ahora; considerar si se plantea compatibilidad multi-versión en el futuro

**Dificultad:** 2/10  
**Requisitos:** Ninguno  
**Estado:** Pendiente

---

### P2: Tests End-to-End (E2E)

**Problema:** Solo tests unitarios. No hay validación de flujos completos (navegación, API → UI).

**Impacto:** Bugs en interacciones reales pueden pasar desapercibidos.

**Propuesta:** Integrar Playwright para:
- Navegación entre categorías eco
- Verificar health endpoint responde correctamente
- Validar SEO (trailing slashes, meta tags, Open Graph)
- Flujo completo: home → categoría → validar contenido

**Dificultad:** 5/10  
**Requisitos:** Decisión entre Playwright vs Cypress  
**Estado:** Pendiente

---

## 🟡 Importante / Media Prioridad

### P3: Implementar módulos de categorías eco (API)

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

### P4: Validación de tipos en runtime (DTOs)

**Problema:** La API no valida payloads/queries. Requests malformados pueden causar errores inesperados.

**Impacto:** Errores de runtime difíciles de debuggear.

**Propuesta:** Implementar DTOs con `class-validator` + `class-transformer`:
- DTOs para query params (ej: fechas, filtros)
- Global ValidationPipe en `main.ts`
- Tests para validaciones

**Dificultad:** 3/10  
**Requisitos:** Ninguno  
**Estado:** Pendiente

---

### P5: Monitoreo y observabilidad

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

### P6: Análisis de bundle (Next.js)

**Problema:** No se mide el tamaño del bundle de Next.js.

**Propuesta:** Integrar `@next/bundle-analyzer`:
- Detectar bloat
- Optimizar imports
- Code splitting strategy

**Dificultad:** 3/10  
**Requisitos:** Ninguno  
**Estado:** Pendiente

---

### P7: Storybook para componentes

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

1. **P1: CI/CD workflow** → Protección inmediata (Dificultad: 2/10)
2. **P2: Tests E2E** → Validación de flujos críticos (Dificultad: 5/10)
3. **P3: Implementar módulos eco** → Funcionalidad real (Dificultad: 6/10)

---

## Notas

- **Dificultad:** escala 1-10 donde 1 es trivial y 10 es extremadamente complejo
- Cada propuesta se trabajará en sesiones independientes
- Antes de implementar, se creará una propuesta OpenSpec siguiendo el workflow SDD
- Este documento se actualizará conforme se completen propuestas
- **Al eliminar un plan o una idea del backlog, renumerar todos los `Ixx` o `Pxx` siguientes** para mantener la secuencia continua sin huecos

---

---

## 💡 Ideas — Backlog de mejoras identificadas

Lista de hallazgos del análisis de repositorio. Sin prioridad asignada aún. Cada ítem puede convertirse en una propuesta formal siguiendo el workflow SDD.

### Documentación

- **I1.** No hay reglas de branch protection documentadas — `AGENTS.md` dice "no pushear a main directamente" pero nada lo enforce.

### Seguridad

- **I2.** `npm audit` detecta 4 vulnerabilidades activas — `brace-expansion` (DoS moderado), `ip-address` (XSS), `picomatch` (ReDoS alto), `postcss` (XSS). Fixable con `npm audit fix`.
- **I3.** CSP en `next.config.ts` tiene `unsafe-eval` — necesario en dev, pero hay que confirmar que esté desactivado en builds de producción.

### CI/CD

- **I4.** No hay estrategia de pre-release o staging — todos los deploys van directo a producción.

### Código — API

- **I5.** `apps/api/src/common/` está vacío — listado en `AGENTS.md` como "Shared pipes, guards, interceptors, filters" pero sin archivos.
- **I6.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único. Cuando web (Vercel) y API (Railway) estén en producción, esto fallará con múltiples orígenes.

### Testing

- **I7.** Sin tests de integración cross-workspace — nada verifica que web pueda llamar correctamente a la API.
- **I8.** Sin tests de accesibilidad automatizados — `axe-core` o `jest-axe` no están configurados. `AGENTS.md` exige a11y pero no hay auditoría sistemática.
- **I9.** Proceso de actualización de snapshots no documentado — `update-snapshots` existe como script pero no hay guía de cuándo/cómo usarlo.

### Configuración y build

- **I10.** TypeScript 6.0.3 genera conflictos de peer deps — `@module-federation/*` y `fork-ts-checker-webpack-plugin` declaran `peerDependency: ^4.9 || ^5.0`. Marcados como "invalid" en `npm ls`.
- **I11.** `legacy-peer-deps=true` en `.npmrc` por `eslint-plugin-jsx-a11y` — temporal, hay que revisarlo cuando el plugin declare soporte para ESLint 10.
- **I12.** `husky pre-commit` solo corre `lint-staged` — no corre `tsc --noEmit`. Un commit puede romper el build sin que el hook lo detecte.
- **I13.** No hay script de limpieza de `test-output/` y `coverage/` — el script `reset` borra `node_modules` pero no los reportes de tests.

### Arquitectura y deuda

- **I14.** OpenSpec `architecture-and-quality` tiene 25 tareas incompletas — refactor de `ApiResponse<T>`, `HealthModule`, íconos duplicados, etc. La implementación no ha comenzado.
- **I15.** Dependencias en el `package.json` raíz — `@nestjs/*`, `next`, `react` están en el root. Deberían estar solo en los apps individuales para evitar conflictos de versión.
- **I16.** Versiones de workspace no sincronizadas — root es `v1.6.0`, api y web son `v1.7.0`, shared es `v1.2.0`. El release workflow genera 4 tags que no correlacionan claramente.
- **I17.** Tres archivos `.releaserc.json` separados — root, api y web. Lógica de release duplicada que hay que actualizar en tres lugares.
- **I18.** Tres `CHANGELOG.md` separados — fragmentan el historial de releases sin referencia cruzada entre ellos.

### Observabilidad y producción

- **I19.** Sin OpenAPI/Swagger — `@nestjs/swagger` no está instalado. La API solo documenta `/health` manualmente en el README.
- **I20.** Sin capa de datos ni ORM — cuando empiece la integración real (P3), no hay TypeORM, Prisma ni esquema de base de datos.

---

**Última actualización:** 17 May 2026
