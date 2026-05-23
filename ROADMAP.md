# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (23 May 2026)

| Aspecto | Estado | Nota |
|---------|--------|------|
| Tests | ✅ | 194 tests pasando, 0 errores |
| Lint | ✅ | Sin warnings |
| Build | ✅ | Compila correctamente |
| CI | ✅ | CI en PRs y push a cualquier branch |
| CD / Deploy | 🟡 | No hay entornos de pre-release/staging (ver I02) |
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

### P3: Monitoreo y observabilidad

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

### P4: Storybook para componentes

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
3. **P3: Monitoreo y observabilidad** → Logs, métricas y error tracking (Dificultad: 7/10)
4. **P4: Storybook** → Documentación visual de componentes (Dificultad: 6/10)
5. **P5: Water Footprint** → Investigación huella hídrica por producto (Dificultad: 4/10)

---

## Notas

- **Dificultad:** escala 1-10 donde 1 es trivial y 10 es extremadamente complejo
- Cada propuesta se trabajará en sesiones independientes
- Antes de implementar, se creará una propuesta OpenSpec siguiendo el workflow SDD
- Este documento se actualizará conforme se completen propuestas
- **Al eliminar un plan o una idea del backlog, renumerar todos los `Ixx` o `Pxx` siguientes** para mantener la secuencia continua sin huecos

---

### P5: Investigación — Water Footprint by Product
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

Lista de hallazgos del análisis de repositorio, ordenados por prioridad (más crítico primero). Cada ítem puede convertirse en una propuesta formal siguiendo el workflow SDD.

### 🔴 Seguridad

- **I01.** `npm audit` reporta 32 vulnerabilidades (31 moderate, 1 high). La mayoría están en dependencias transitivas que el proyecto no controla: `@module-federation/*` (29 vulns, dentro de NX 22) y `yaml` (2 vulns, bundleado en `node_modules/nx/`). No son solucionables con `npm audit fix` desde el proyecto — requieren un upgrade de NX a una versión más reciente, lo cual es un cambio mayor con posibles breaking changes.

### 🟡 CI/CD

- **I02.** No hay estrategia de pre-release o staging — todos los deploys (Vercel, Railway) van directo a producción desde `main`. No hay preview deploys desde `develop` ni entorno de pruebas separado. Solución pragmática: inicialmente solo prod por simplicidad; agregar staging cuando el sitio tenga tráfico mínimo y se justifique el costo/beneficio.

### 🟡 API / Seguridad

- **I03.** Solo un origen soportado en CORS — `CORS_ORIGIN` es un string único en `AppConfigService`. Cuando web (Vercel preview + prod) y API (Railway) tengan múltiples entornos, esto fallará con orígenes distintos (localhost, preview URLs, dominio productivo).

### 🟡 Testing

- **I04.** Sin tests de integración cross-workspace — nada verifica que web pueda llamar correctamente a la API (contratos de tipos compartidos, respuestas esperadas, manejo de errores).
- **I05.** Sin tests de accesibilidad automatizados — `axe-core` o `jest-axe` no están configurados. `AGENTS.md` exige a11y pero no hay auditoría sistemática.

### 🟡 API / Observabilidad

- **I06.** Sin OpenAPI/Swagger — `@nestjs/swagger` no está instalado. La API solo documenta `/health` manualmente en el README. Cualquier consumidor (frontend, terceros) no tiene contrato tipado ni documentación interactiva.

### 🟢 Arquitectura / Deuda técnica

- **I07.** Versiones de workspace no sincronizadas — root es `v1.6.1`, api y web son `v1.7.1`, shared es `v1.2.0`. El release workflow genera tags que no correlacionan claramente entre los 4 paquetes.
- **I08.** Tres archivos `.releaserc.json` separados — root, api y web. Lógica de release duplicada que hay que actualizar en tres lugares.
- **I09.** Tres `CHANGELOG.md` separados — fragmentan el historial de releases sin referencia cruzada entre ellos.
- **I10.** Sin capa de datos ni ORM — cuando empiece la integración real de datos (P2), no hay TypeORM, Prisma ni esquema de base de datos definido.

### 🟢 Configuración / Build

- **I11.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.

---

**Última actualización:** 23 May 2026
