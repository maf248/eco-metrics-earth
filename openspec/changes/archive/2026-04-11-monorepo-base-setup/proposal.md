## Why

El proyecto eco-metrics earth no tiene estructura de código. Se necesita establecer la base del monorepo con todas las herramientas, configuraciones y convenciones antes de poder desarrollar cualquier feature. Sin esta base sólida, el desarrollo sería inconsistente, no testeable y difícil de escalar.

## What Changes

- Inicialización del monorepo NX con workspace configurado
- Creación de la app `web` con Next.js + TypeScript + Tailwind CSS (App Router)
- Creación de la app `api` con NestJS + TypeScript (BFF)
- Creación del package `shared` con tipos TypeScript compartidos entre apps
- Configuración de Jest en ambas apps con Testing Library en `web`
- Configuración de ESLint + Prettier unificada en el monorepo
- Scripts NX para levantar, testear y buildear ambas apps
- Archivos `.env.example` con variables de entorno base
- Estructura de carpetas base orientada a módulos por categoría ecológica en el BFF
- Estructura de carpetas base con App Router en el frontend

## Capabilities

### New Capabilities

- `nx-workspace`: Configuración base del monorepo NX con apps `web` y `api` y package `shared`
- `web-app-scaffold`: Scaffold de Next.js App Router con TypeScript, Tailwind CSS y Jest configurados
- `api-app-scaffold`: Scaffold de NestJS con TypeScript, estructura modular por categoría y Jest configurado
- `shared-types`: Package compartido con tipos TypeScript e interfaces base del dominio ecológico

### Modified Capabilities

<!-- Ninguna — este es el setup inicial, no hay specs existentes -->

## Non-Goals

- No se definen ni implementan módulos de categorías ecológicas específicas (aire, especies, etc.)
- No se conectan APIs externas
- No se crea UI más allá del layout base y página de inicio placeholder
- No se configura autenticación
- No se configura CI/CD ni pipelines de deploy (Vercel/Railway)
- No se implementan gráficos ni visualizaciones de datos

## Impact

- Crea la estructura completa del repositorio desde cero
- Establece las convenciones de código, testing y organización para todo el desarrollo futuro
- Todos los cambios futuros dependen de este setup
