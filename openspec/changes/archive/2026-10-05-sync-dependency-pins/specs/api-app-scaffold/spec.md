## MODIFIED Requirements

### Requirement: NestJS app with modular per-category structure

The original requirement stands: the `api` app SHALL have a root module (`AppModule`) and a `modules/` folder prepared to host per-eco-category modules, each following `modules/<category>/<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`. Updated: the app SHALL run on **NestJS 12** — `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, and `@nestjs/testing` pinned at exactly `12.1.2`, `@nestjs/swagger` at exactly `12.0.2`, `@nestjs/config` at exactly `12.0.1` (no `^`/`~`), with `@nestjs/throttler` at `6.7.1` (peer range declares NestJS 12 since 6.7.1 — pin retired). The app SHALL remain CommonJS; the ESM-published `@nestjs/*` 12 packages are consumed via Node's native `require(esm)`.

#### Scenario: API responds on the correct port _(unchanged behavior, new framework major)_

- **GIVEN** the workspace with the `@nestjs/*` 12.x exact pins installed and the lockfile in sync
- **WHEN** `nx serve api` is executed
- **THEN** NestJS 12 starts on `http://localhost:3001` without errors or warnings

#### Scenario: Health check endpoint available _(unchanged)_

- **WHEN** a GET is sent to `http://localhost:3001/api/v1/health`
- **THEN** the server responds with status 200 and body `{ "status": "ok" }`

#### Scenario: NestJS versions pinned exactly with no nested 11.x copies

- **WHEN** `apps/api/package.json` and the installed tree are inspected after the upgrade
- **THEN** `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` are pinned at `"12.1.2"`, `@nestjs/swagger` at `"12.0.2"` and `@nestjs/config` at `"12.0.1"` — exact, no `^`/`~`
- **AND** `npm ls @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/swagger @nestjs/config @nestjs/testing` resolves a single 12.x version each, with no nested 11.x copies
