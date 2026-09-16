# web-app-scaffold Specification

## Purpose
TBD - created by archiving change monorepo-base-setup. Update Purpose after archive.
## Requirements
### Requirement: Next.js App Router con layout base
La app `web` SHALL usar Next.js con App Router. SHALL existir un layout raíz (`app/layout.tsx`) con estructura HTML semántica, metadata base y soporte para dark mode mediante clase CSS en `<html>`.

#### Scenario: Página de inicio responde con HTML
- **WHEN** se accede a `http://localhost:3000`
- **THEN** el servidor retorna HTML con status 200 y metadata básica del sitio

#### Scenario: Dark mode habilitado por defecto
- **WHEN** se renderiza cualquier página
- **THEN** el elemento `<html>` tiene la clase `dark` aplicada por defecto

### Requirement: Tailwind CSS configurado con dark mode
Tailwind CSS SHALL estar configurado con la estrategia `class` para dark mode. El archivo `tailwind.config.ts` SHALL incluir los paths de todos los archivos de la app `web`.

#### Scenario: Clase dark mode funciona en componentes
- **WHEN** el elemento `<html>` tiene la clase `dark`
- **THEN** las clases `dark:` de Tailwind aplican sus estilos correctamente

### Requirement: Estructura de carpetas base del frontend
La app `web` SHALL tener la siguiente estructura de carpetas dentro de `src/`:
- `app/` — rutas y layouts (App Router)
- `components/` — componentes reutilizables
- `lib/` — utilidades y helpers
- `types/` — tipos TypeScript locales del frontend

#### Scenario: Importaciones entre carpetas funcionan
- **WHEN** un componente importa desde `@/lib/utils`
- **THEN** el alias de path resuelve correctamente sin errores

### Requirement: Test de smoke del frontend
SHALL existir al menos un test de smoke que verifique que el componente de layout raíz renderiza sin errores.

#### Scenario: Test de smoke pasa
- **WHEN** se ejecuta `nx test web`
- **THEN** el test de smoke pasa y Jest retorna exit code 0
