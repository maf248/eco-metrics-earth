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

---

**Última actualización:** 17 May 2026
