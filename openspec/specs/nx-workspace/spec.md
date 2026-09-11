## ADDED Requirements

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

### Requirement: TypeScript strict habilitado en todo el workspace
Todas las apps y packages SHALL tener `strict: true` en su `tsconfig.json`. El compilador SHALL rechazar código con tipos implícitos `any` o asignaciones inseguras.

#### Scenario: Código con tipo implícito any falla compilación
- **WHEN** se escribe una función sin tipar sus parámetros
- **THEN** `tsc` reporta error y el build falla

### Requirement: ESLint y Prettier configurados de forma unificada
El workspace SHALL tener configuración compartida de ESLint y Prettier. Ambas apps SHALL heredar las mismas reglas base.

#### Scenario: Código mal formateado es detectado
- **WHEN** se ejecuta `nx run-many --target=lint --all`
- **THEN** ESLint reporta violaciones de estilo sin errores de configuración

### Requirement: Variables de entorno documentadas
Cada app SHALL tener un archivo `.env.example` con todas las variables de entorno necesarias documentadas con comentarios.

#### Scenario: Developer nuevo puede iniciar el proyecto
- **WHEN** un developer copia `.env.example` a `.env.local`
- **THEN** puede levantar las apps en desarrollo sin configuración adicional

### Requirement: NX toolchain sin vulnerabilidades auditables conocidas

El árbol de dependencias del workspace SHALL estar libre de advisories de `npm audit` cuya ruta de fix pase por `nx`, cualquier paquete `@nx/*` o `@module-federation/*`. Los conteos de audit antes y después de la migración SHALL quedar documentados; los advisories restantes fuera del subárbol de NX (NestJS, tooling de release, y advisories sin fix disponible upstream) quedan explícitamente fuera de alcance.

#### Scenario: Audit sin advisories del subárbol NX

- **GIVEN** el workspace en NX 23.2.1 con `package-lock.json` regenerado
- **WHEN** se ejecuta `npm audit --json`
- **THEN** ningún advisory listado tiene como fix un paquete de la familia `nx` / `@nx/*` / `@module-federation/*`
- **AND** el bloque de baseline del subárbol NX (advisories contra `@nx/*` ≤22.7.6, `@module-federation/*`, `webpack-dev-server`, `svgo`, `undici`, `ws`, `adm-zip`, `axios`/`tmp`/`yaml`/`form-data`/`brace-expansion` de `nx@22.7.2`) ha desaparecido del reporte

#### Scenario: Conteos de audit registrados

- **WHEN** la migración se completa
- **THEN** los conteos exactos antes/después (por severidad) quedan registrados en ROADMAP.md (I01)
- **AND** las familias restantes quedan documentadas con su owner en el ROADMAP

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
