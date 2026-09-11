# Spec: NX Workspace — NX 23 Upgrade (Delta)

Delta against the existing `nx-workspace` capability. This change adds no product behavior; it modifies the toolchain requirement and adds toolchain-quality requirements.

## MODIFIED

### Requirement: NX workspace inicializado con apps y packages

El workspace NX SHALL contener las apps `web` y `api` y el package `shared`, todos reconocidos por NX y ejecutables mediante su task runner — sobre **NX 23.2.1** (todas las familias de paquetes `nx` / `@nx/*` fijadas en la versión exacta `23.2.1`, sin `^` ni `~`, en lockstep). Los targets SHALL seguir inferiéndose mediante los plugins de `nx.json` (`@nx/js/typescript`, `@nx/jest/plugin`, `@nx/next/plugin`, `@nx/eslint/plugin`, `@nx/webpack/plugin`, `@nx/playwright/plugin`) y los bloques `nx.targets` en los `package.json` de cada proyecto — sin `project.json` ni executors deprecados.

#### Scenario: Levantar todas las apps en desarrollo

- **GIVEN** el workspace migrado a NX 23.2.1 con la caché reseteada (`npx nx reset`)
- **WHEN** se ejecuta `nx run-many --targets=dev,serve --all`
- **THEN** las apps `web` y `api` levantan en paralelo sin errores ni warnings de deprecación
- **AND** el HMR de `@eco-metrics/shared` funciona en `web` (vía `transpilePackages` explícito en `next.config.ts`)

#### Scenario: Ejecutar todos los tests del monorepo

- **WHEN** se ejecuta `nx run-many --target=test --all`
- **THEN** Jest corre en las tres proyectos (279 tests) y retorna resultados sin errores ni warnings de configuración

#### Scenario: Build de todas las apps

- **WHEN** se ejecuta `nx run-many --target=build --all`
- **THEN** `shared` (tsc), `api` (webpack vía `NxAppWebpackPlugin`) y `web` (Next) compilan sin errores de TypeScript
- **AND** el log de build no contiene warnings de deprecación de NX 23

## ADDED

### Requirement: NX toolchain sin vulnerabilidades auditables conocidas

El árbol de dependencias del workspace SHALL estar libre de advisories de `npm audit` cuya ruta de fix pase por `nx`, cualquier paquete `@nx/*` o `@module-federation/*`. Los conteos de audit antes y después de la migración SHALL quedar documentados; los advisories restantes fuera del subárbol de NX (NestJS → D2, semantic-release/concurrently → D4, postcss) quedan explícitamente fuera de alcance.

#### Scenario: Audit sin advisories del subárbol NX

- **GIVEN** el workspace en NX 23.2.1 con `package-lock.json` regenerado
- **WHEN** se ejecuta `npm audit --json`
- **THEN** ningún advisory listado tiene como fix un paquete de la familia `nx` / `@nx/*` / `@module-federation/*`
- **AND** el bloque de baseline del subárbol NX (advisories contra `@nx/*` ≤22.7.6, `@module-federation/*`, `webpack-dev-server`, `svgo`, `undici`, `ws`, `adm-zip`, `axios`/`tmp`/`yaml`/`form-data`/`brace-expansion` de `nx@22.7.2`) ha desaparecido del reporte

#### Scenario: Conteos de audit registrados

- **WHEN** la migración se completa
- **THEN** los conteos exactos antes/después (por severidad) quedan registrados en ROADMAP.md (D1/I01)
- **AND** las familias restantes quedan documentadas con su owner (D2 o D4)

### Requirement: Operación del toolchain sin warnings en NX 23

El workspace SHALL operar en NX 23 sin warnings de deprecación en build, test ni lint. La configuración de Next.js SHALL usar únicamente APIs soportadas (sin los helpers deprecados `withNx` / `composePlugins` de `@nx/next`), con `transpilePackages: ['@eco-metrics/shared']` declarado explícitamente.

#### Scenario: next.config.ts sin helpers deprecados

- **GIVEN** `apps/web/next.config.ts` migrado (sin `withNx`/`composePlugins`, con `transpilePackages` explícito)
- **WHEN** se ejecuta `npx nx build web` y `npx nx dev web`
- **THEN** ambos comandos completan sin warnings de deprecación de NX
- **AND** el resto de la configuración (trailing slash, security headers/CSP, bundle analyzer) permanece sin cambios de comportamiento

#### Scenario: Versiones NX en lockstep con pin exacto

- **WHEN** se inspecciona el `package.json` raíz tras la migración
- **THEN** los diez paquetes de la familia NX (`nx`, `@nx/devkit`, `@nx/jest`, `@nx/js`, `@nx/nest`, `@nx/next`, `@nx/node`, `@nx/playwright`, `@nx/react`, `@nx/webpack`) están fijados en `"23.2.1"` exacto
- **AND** `npm ls` no muestra copias anidadas de la familia NX en versiones 22.x

## File Changes

### MODIFIED: root `package.json`

Ten NX-family pins `22.7.x` → `"23.2.1"` (exact).

### MODIFIED: `package-lock.json`

Regenerated — NX transitive tree replaced.

### MODIFIED: `nx.json`

Only as touched by `nx migrate` migrations (plugin options / generator defaults); no manual redesign.

### MODIFIED: `apps/web/next.config.ts`

Remove `withNx`/`composePlugins` (deprecated in NX 23, warn); add explicit `transpilePackages: ['@eco-metrics/shared']`; all other config unchanged.

### MODIFIED: `README.md`, `AGENTS.md`, `ROADMAP.md`

Version table (NX 23.2.1), NX version mentions, D1/I01 status with final audit numbers.

### NOT MODIFIED (explicitly)

`apps/api/webpack.config.js` (already uses `NxAppWebpackPlugin`), all `src/**` application code, `.github/workflows/ci.yml`, `vercel.json`, TypeScript/Next.js/React versions.
