## ADDED Requirements

### Requirement: NestJS app con estructura modular por categoría
La app `api` SHALL tener un módulo raíz (`AppModule`) y una carpeta `modules/` preparada para alojar módulos por categoría ecológica. Cada módulo futuro SHALL seguir la estructura: `modules/<category>/<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`.

#### Scenario: API responde en el puerto correcto
- **WHEN** se ejecuta `nx serve api`
- **THEN** NestJS levanta en `http://localhost:3001` sin errores

#### Scenario: Health check endpoint disponible
- **WHEN** se hace GET a `http://localhost:3001/api/v1/health`
- **THEN** el servidor responde con status 200 y body `{ "status": "ok" }`

### Requirement: Prefijo global de rutas configurado
Todos los endpoints del BFF SHALL estar bajo el prefijo `/api/v1`. El prefijo SHALL configurarse globalmente en el bootstrap de la aplicación.

#### Scenario: Rutas sin prefijo retornan 404
- **WHEN** se hace GET a `http://localhost:3001/health` (sin prefijo)
- **THEN** el servidor retorna status 404

#### Scenario: Rutas con prefijo correcto responden
- **WHEN** se hace GET a `http://localhost:3001/api/v1/health`
- **THEN** el servidor retorna status 200

### Requirement: Estructura de carpetas base del BFF
La app `api` SHALL tener la siguiente estructura dentro de `src/`:
- `modules/` — módulos NestJS por categoría ecológica
- `common/` — pipes, interceptors, guards y filtros compartidos
- `config/` — configuración de la aplicación (env vars tipadas)

#### Scenario: Módulo de configuración carga variables de entorno
- **WHEN** la app levanta con un `.env` válido
- **THEN** las variables de entorno están disponibles tipadas a través del ConfigService de NestJS

### Requirement: Test de smoke del BFF
SHALL existir al menos un test de smoke que verifique que el `AppModule` compila y el health check responde correctamente.

#### Scenario: Test de smoke del BFF pasa
- **WHEN** se ejecuta `nx test api`
- **THEN** el test de smoke pasa y Jest retorna exit code 0
