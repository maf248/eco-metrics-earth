## ADDED Requirements

### Requirement: NX workspace inicializado con apps y packages
El workspace NX SHALL contener las apps `web` y `api` y el package `shared`, todos reconocidos por NX y ejecutables mediante su task runner.

#### Scenario: Levantar todas las apps en desarrollo
- **WHEN** se ejecuta `nx run-many --target=serve --all`
- **THEN** las apps `web` y `api` levantan en paralelo sin errores

#### Scenario: Ejecutar todos los tests del monorepo
- **WHEN** se ejecuta `nx run-many --target=test --all`
- **THEN** Jest corre en ambas apps y retorna resultados sin errores de configuración

#### Scenario: Build de todas las apps
- **WHEN** se ejecuta `nx run-many --target=build --all`
- **THEN** ambas apps compilan sin errores de TypeScript

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
