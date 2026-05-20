# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (17 May 2026)

| Aspecto | Estado | Nota |
|---------|--------|------|
| Tests | ✅ | 162 tests pasando, 0 errores |
| Lint | ✅ | Sin warnings |
| Build | ✅ | Compila correctamente |
| CI/CD | ✅ | CI en PRs y push a cualquier branch |
| Dependencias | ✅ | Al día (Fase 1 + Fase 2 aplicadas) |
| Coverage | ✅ | Medido con Jest |
| E2E | ❌ | No implementado |
| Monitoreo | ❌ | No implementado |

---

## 🔴 Crítico / Alta Prioridad

### P1: Tests End-to-End (E2E)

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

### P2: Implementar módulos de categorías eco (API)

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

### P3: Validación de tipos en runtime (DTOs)

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

### P4: Monitoreo y observabilidad

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

### P5: Análisis de bundle (Next.js)

**Problema:** No se mide el tamaño del bundle de Next.js.

**Propuesta:** Integrar `@next/bundle-analyzer`:
- Detectar bloat
- Optimizar imports
- Code splitting strategy

**Dificultad:** 3/10  
**Requisitos:** Ninguno  
**Estado:** Pendiente

---

### P6: Storybook para componentes

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

1. **P1: Tests E2E** → Validación de flujos críticos (Dificultad: 5/10)
2. **P2: Implementar módulos eco** → Funcionalidad real (Dificultad: 6/10)
3. **P3: DTOs + ValidationPipe** → Hardening de la API (Dificultad: 3/10)

---

## Notas

- **Dificultad:** escala 1-10 donde 1 es trivial y 10 es extremadamente complejo
- Cada propuesta se trabajará en sesiones independientes
- Antes de implementar, se creará una propuesta OpenSpec siguiendo el workflow SDD
- Este documento se actualizará conforme se completen propuestas
- **Al eliminar un plan o una idea del backlog, renumerar todos los `Ixx` o `Pxx` siguientes** para mantener la secuencia continua sin huecos

---

### P7: Investigación — Water Footprint by Product
**Problema:** Ninguna categoría actual del dashboard muestra el consumo de agua asociado a productos de consumo cotidiano. Las fuentes documentadas (World Bank, OWID, NOAA) cubren solo datos macro: extracción por país, estrés hídrico y temperatura oceánica.
**Impacto:** Los usuarios no pueden visualizar ni comparar la huella hídrica de sus decisiones de consumo (alimentos, textiles, electrónica).
**Propuesta:**  
1. **Investigar y compilar un dataset estático** (~30–50 productos) a partir de:
   - **Our World in Data** (Poore & Nemecek 2018) — alimentos via CSV Grapher API (`/grapher/water-withdrawals-per-kg-poore.csv`).
   - **Water Footprint Network (WaterPub)** — cultivos, animales y algunos textiles (PDF/Excel dispersos).
   - **Papers de LCA (Life Cycle Assessment)** — electrónica y productos manufacturados (ej. estudios de Apple, Samsung, y papers académicos sobre acero, cemento, vidrio).
2. **Cada entrada del dataset debe incluir la cita/fuente original** (paper, reporte o dataset).
3. **Mostrar los datos en cards/tablas comparativas** en una nueva sección del dashboard, permitiendo filtrar por categoría (Alimentos, Textiles, Manufacturados, Tecnología).
4. **Evaluar si amerita una categoría eco nueva** (ej. `/water-footprint/`) o si se integra como sub-sección dentro de una existente.
**Ejemplos de datos objetivo:**
| Producto | Huella hídrica aprox. | Fuente típica |
|---|---|---|
| Smartphone (1 unidad) | ~12,000 L | LCA papers (Apple, Samsung) |
| Par de jeans (algodón) | ~7,000 – 10,000 L | WFN / Textile LCA |
| Camiseta de algodón | ~2,700 L | WFN / Textile LCA |
| Hoja de papel A4 | ~10 L | WFN / Paper LCA |
| Litro de cerveza | ~300 L | OWID / Poore & Nemecek |
| Litro de vino | ~800 – 1,000 L | OWID / Poore & Nemecek |
| Auto compacto | ~400,000 L | Steel & paint LCA |
| 1 kg de carne de res | ~15,400 L | OWID / Poore & Nemecek |
| 1 kg de pollo | ~4,300 L | OWID / Poore & Nemecek |
| 1 kg de almendras | ~16,000 L | OWID / Poore & Nemecek |
**Nota clave:** No existe una API pública única con datos por producto manufacturado. El enfoque es un **dataset estático embebido en el repo** (JSON/CSV) con atribución explícita por ítem.
**Dificultad:** 4/10  
**Requisitos:** Compilación manual de datos, validación de fuentes, decisión de UX (cards vs tabla vs gráfico de barras comparativo)  
**Estado:** Pendiente

---

## 💡 Ideas — Backlog de mejoras identificadas

Lista de hallazgos del análisis de repositorio. Sin prioridad asignada aún. Cada ítem puede convertirse en una propuesta formal siguiendo el workflow SDD.

### Seguridad

- **I1.** `npm audit` reporta ~21 vulnerabilidades, todas en dependencias que el proyecto no controla: `brace-expansion`, `ip-address`, `picomatch` están en los `node_modules` internos de npm (no del proyecto); `postcss` está bundleado dentro de `next`. Requieren upgrade de npm o de next para resolverse — no son solucionables con `npm audit fix` desde el proyecto.

### CI/CD

- **I2.** No hay estrategia de pre-release o staging — todos los deploys van directo a producción.

### Código — API

- **I3.** `apps/api/src/common/` está vacío — listado en `AGENTS.md` como "Shared pipes, guards, interceptors, filters" pero sin archivos.
- **I4.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único. Cuando web (Vercel) y API (Railway) estén en producción, esto fallará con múltiples orígenes.

### Testing

- **I5.** Sin tests de integración cross-workspace — nada verifica que web pueda llamar correctamente a la API.
- **I6.** Sin tests de accesibilidad automatizados — `axe-core` o `jest-axe` no están configurados. `AGENTS.md` exige a11y pero no hay auditoría sistemática.

### Configuración y build

- **I7.** TypeScript 6.0.3 genera conflictos de peer deps — `@module-federation/*` y `fork-ts-checker-webpack-plugin` declaran `peerDependency: ^4.9 || ^5.0`. Marcados como "invalid" en `npm ls`.
- **I8.** `legacy-peer-deps=true` en `.npmrc` por `eslint-plugin-jsx-a11y` — temporal, hay que revisarlo cuando el plugin declare soporte para ESLint 10.

### Arquitectura y deuda

- **I9.** OpenSpec `architecture-and-quality` tiene 25 tareas incompletas — refactor de `ApiResponse<T>`, `HealthModule`, íconos duplicados, etc. La implementación no ha comenzado.
- **I10.** Dependencias en el `package.json` raíz — `@nestjs/*`, `next`, `react` están en el root. Deberían estar solo en los apps individuales para evitar conflictos de versión.
- **I11.** Versiones de workspace no sincronizadas — root es `v1.6.0`, api y web son `v1.7.0`, shared es `v1.2.0`. El release workflow genera 4 tags que no correlacionan claramente.
- **I12.** Tres archivos `.releaserc.json` separados — root, api y web. Lógica de release duplicada que hay que actualizar en tres lugares.
- **I13.** Tres `CHANGELOG.md` separados — fragmentan el historial de releases sin referencia cruzada entre ellos.

### Observabilidad y producción

- **I14.** Sin OpenAPI/Swagger — `@nestjs/swagger` no está instalado. La API solo documenta `/health` manualmente en el README.
- **I15.** Sin capa de datos ni ORM — cuando empiece la integración real (P2), no hay TypeORM, Prisma ni esquema de base de datos.

---

**Última actualización:** 17 May 2026
