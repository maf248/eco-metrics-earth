## Context

El repositorio existe pero está vacío (solo configuración de agentes SDD). Se necesita establecer el monorepo completo desde cero. El equipo es un desarrollador individual con experiencia en React, TypeScript, Redux, Jest y conocimiento de Node. El stack fue elegido para maximizar aprendizaje valioso (NX, NestJS) sin sacrificar familiaridad (React, TypeScript, Jest).

Stack definido:
- **Runtime:** Node.js (LTS)
- **Monorepo:** NX
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** NestJS + TypeScript
- **Testing:** Jest + Testing Library (`web`), Jest (`api`)
- **Linting/Format:** ESLint + Prettier
- **Deploy:** Vercel (web), Railway (api)

## Goals / Non-Goals

**Goals:**
- Monorepo NX funcional con ambas apps (`web`, `api`) y package `shared` levantando en desarrollo con un solo comando
- Convenciones de código, testing y estructura definidas y aplicables desde el día uno
- TypeScript strict en todas las apps y packages
- Tailwind CSS operativo con dark mode habilitado en `web`
- Jest configurado y con al menos un test de smoke en cada app
- Estructura de carpetas que refleje la arquitectura de módulos por categoría ecológica

**Non-Goals:**
- Implementación de módulos de negocio
- Conexión con APIs externas
- UI más allá de un layout base y home placeholder
- Configuración de CI/CD o pipelines de deploy

## Decisions

### 1. NX como herramienta de monorepo
**Elegido sobre:** Turborepo, pnpm workspaces puro  
**Razón:** NX tiene plugins oficiales para Next.js y NestJS con generadores, task runner con caché, y comando `affected` para testear solo lo que cambió. Turborepo es más agnóstico pero requiere más configuración manual para estos frameworks.

### 2. Next.js App Router (no Pages Router)
**Elegido sobre:** Pages Router  
**Razón:** App Router es el estándar actual de Next.js 14+. Server Components reducen JS enviado al cliente. Layout nesting es más limpio. El proyecto empieza nuevo, no hay costo de migración.

### 3. NestJS con arquitectura modular por categoría ecológica
**Elegido sobre:** Express/Fastify con estructura plana  
**Razón:** Cada categoría (aire, especies, océanos, etc.) será un módulo NestJS independiente con su propio servicio, controlador y tests. Esto hace el BFF predecible, testeable y escalable. NestJS aporta DI nativa que facilita mocking en tests.

### 4. Package `shared` para tipos TypeScript
**Razón:** El BFF y el frontend comparten contratos de datos (interfaces de respuesta de la API). Definirlos en un package compartido evita duplicación y garantiza consistencia end-to-end. A futuro puede incluir utilidades, constantes de dominio, etc.

### 5. Tailwind CSS puro (sin component library)
**Elegido sobre:** shadcn/ui, Headless UI  
**Razón:** Decisión deliberada para aprender Tailwind a fondo y mantener control total del diseño. Se puede agregar una librería luego si se necesita.

### 6. Un solo Jest config por app (no Jest projects unificado)
**Razón:** NestJS y Next.js tienen entornos de test distintos (Node vs jsdom). Mantenerlos separados evita colisiones de configuración y es el patrón recomendado por NX.

## Risks / Trade-offs

- **[NX learning curve]** → NX tiene su propia CLI y conceptos (executors, generators, affected). Mitigación: usar los generadores oficiales de NX para crear apps y no customizar hasta necesitar.
- **[Next.js App Router complejidad]** → El modelo de Server/Client Components puede ser confuso al principio. Mitigación: por defecto todo es Server Component, solo agregar `"use client"` cuando se necesite interactividad explícita.
- **[Dos servicios en desarrollo]** → Hay que levantar `web` y `api` juntos. Mitigación: script NX `run-many` para levantarlos en paralelo con un solo comando.
- **[Deploy en dos plataformas]** → Vercel para web y Railway para api agrega complejidad operacional. Mitigación: aceptado como trade-off del stack. Railway es sencillo de conectar desde GitHub.

## Migration Plan

No aplica — setup desde cero. No hay estado previo que migrar ni rollback necesario.

## Open Questions

- ¿Versión específica de Node.js a fijar en `.nvmrc`? → Usar LTS actual (v20)
- ¿Puerto por defecto del BFF en desarrollo? → `3001` (web en `3000`)
- ¿Prefijo de rutas del BFF? → `/api/v1`
