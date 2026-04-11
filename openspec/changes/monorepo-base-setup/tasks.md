## 1. NX Workspace

- [x] 1.1 Inicializar workspace NX con preset `ts` en el directorio raíz del repo existente
- [x] 1.2 Configurar `nx.json` con caché y targets base (`build`, `serve`, `test`, `lint`)
- [x] 1.3 Crear `.nvmrc` con Node.js LTS v20
- [x] 1.4 Configurar ESLint compartido en la raíz del workspace
- [x] 1.5 Configurar Prettier en la raíz del workspace con reglas base (singleQuote, semi, tabWidth: 2)
- [x] 1.6 Verificar que `nx run-many --target=lint --all` corre sin errores de configuración

## 2. Package Shared

- [x] 2.1 Generar package `shared` con NX (`nx generate @nx/js:library shared`)
- [x] 2.2 Configurar nombre de paquete como `@eco-metrics/shared` en su `package.json`
- [x] 2.3 Crear interfaz genérica `ApiResponse<T>` con campos `data`, `timestamp` y `error` opcional
- [x] 2.4 Crear enum/tipo `EcoCategory` con las seis categorías del MVP
- [x] 2.5 Exportar todos los tipos desde el `index.ts` del package
- [x] 2.6 Verificar que TypeScript resuelve `@eco-metrics/shared` desde ambas apps

## 3. App Web (Next.js)

- [x] 3.1 Generar app `web` con NX (`nx generate @nx/next:app web`)
- [x] 3.2 Configurar TypeScript strict en `tsconfig.json` de la app `web`
- [x] 3.3 Instalar y configurar Tailwind CSS con estrategia `class` para dark mode
- [x] 3.4 Crear `app/layout.tsx` con estructura HTML semántica, metadata base y clase `dark` en `<html>`
- [x] 3.5 Crear `app/page.tsx` con página home placeholder
- [x] 3.6 Crear estructura de carpetas `src/components/`, `src/lib/`, `src/types/`
- [x] 3.7 Configurar path alias `@/` apuntando a `src/` en `tsconfig.json`
- [x] 3.8 Crear `.env.example` con variables de entorno base (`NEXT_PUBLIC_API_URL`)
- [x] 3.9 Escribir test de smoke que verifique que el layout raíz renderiza sin errores
- [x] 3.10 Verificar que `nx test web` pasa con el test de smoke

## 4. App API (NestJS)

- [x] 4.1 Generar app `api` con NX (`nx generate @nx/nest:app api`)
- [x] 4.2 Configurar TypeScript strict en `tsconfig.json` de la app `api`
- [x] 4.3 Configurar prefijo global de rutas `/api/v1` en `main.ts`
- [x] 4.4 Configurar puerto `3001` en `main.ts`
- [x] 4.5 Crear `HealthController` con endpoint GET `/api/v1/health` que retorna `{ status: 'ok' }`
- [x] 4.6 Instalar y configurar `@nestjs/config` para manejo tipado de variables de entorno
- [x] 4.7 Crear estructura de carpetas `src/modules/`, `src/common/`, `src/config/`
- [x] 4.8 Crear `AppConfigService` que expone las variables de entorno tipadas
- [x] 4.9 Crear `.env.example` con variables base (`PORT`, `NODE_ENV`)
- [x] 4.10 Escribir test de smoke que verifique que `AppModule` compila y el health check responde
- [x] 4.11 Verificar que `nx test api` pasa con el test de smoke

## 5. Integración y Verificación Final

- [x] 5.1 Verificar que `nx run-many --target=serve --all` levanta ambas apps en paralelo sin errores
- [x] 5.2 Verificar que `nx run-many --target=build --all` compila ambas apps sin errores de TypeScript
- [x] 5.3 Verificar que `nx run-many --target=test --all` corre todos los tests y pasan
- [x] 5.4 Verificar que `@eco-metrics/shared` es importable desde `apps/web` y `apps/api`
- [x] 5.5 Actualizar `AGENTS.md` con el stack definido, comandos de build/test/dev y estructura de carpetas
