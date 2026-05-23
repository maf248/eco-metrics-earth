## 1. Remove app-specific runtime dependencies from root

- [x] 1.1 Remove `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs` from root `package.json` `dependencies`
- [x] 1.2 Remove `next`, `react`, `react-dom` from root `package.json` `dependencies`
- [x] 1.3 Remove `@nestjs/testing` from root `package.json` `devDependencies`
- [x] 1.4 Remove `@types/react` and `@types/react-dom` from root `package.json` `devDependencies`

## 2. Add type definitions to web app

- [x] 2.1 Add `@types/react` exact version `19.2.14` to `apps/web/package.json` `devDependencies`
- [x] 2.2 Add `@types/react-dom` exact version `19.2.3` to `apps/web/package.json` `devDependencies`

## 3. Rebuild and verify

- [x] 3.1 Run `npm install` to regenerate `node_modules` and `package-lock.json`
- [x] 3.2 Run `npm run build` — all three projects (shared, api, web) must compile with zero errors
- [x] 3.3 Run `npm run test` — all 194 tests must pass with zero errors and zero warnings
- [x] 3.4 Inspect root `package.json` `dependencies` — verify no `@nestjs/*`, `next`, `react`, `react-dom`, `reflect-metadata`, or `rxjs` remain
- [x] 3.5 Inspect `apps/web/package.json` `devDependencies` — verify `@types/react` and `@types/react-dom` are present

## 4. Documentation

- [x] 4.1 Update ROADMAP.md — mark I07 as resolved
- [x] 4.2 Update ROADMAP.md — correct false mention of `class-validator` and `class-transformer` in root (they were never there)
