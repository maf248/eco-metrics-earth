## 1. Remove Unused devDependencies

- [x] 1.1 Remove `ts-jest`, `@nestjs/schematics`, `@nx/web`, and `ts-node` from root `package.json` devDependencies
- [x] 1.2 Run `npm install` to regenerate `package-lock.json`
- [x] 1.3 Run `npm run build && npm run test && npm run lint` — confirm all pass with zero errors

## 2. Upgrade reflect-metadata

- [x] 2.1 Bump `reflect-metadata` to `0.2.2` in `apps/api/package.json`
- [x] 2.2 Run `npm install` to update lockfile
- [x] 2.3 Run `npx nx test api` — confirm all API tests pass with zero errors

## 3. Upgrade webpack-cli

- [x] 3.1 Bump `webpack-cli` to `7.0.2` in root `package.json`
- [x] 3.2 Run `npm install` to update lockfile
- [x] 3.3 Run `npx nx build api` — confirm production build succeeds
- [x] 3.4 Run `npx nx build api --configuration=development` — confirm dev build succeeds
- [x] 3.5 Fix any webpack-cli CLI changes (deprecated flags, command-name changes) if needed

## 4. Upgrade ESLint 10

- [x] 4.1 Bump `eslint` to `10.4.0` and `@eslint/js` to `10.0.1` in root `package.json`
- [x] 4.2 Run `npm install` to update lockfile
- [x] 4.3 Run `npm run lint` — confirm zero errors and zero warnings
- [x] 4.4 Fix any rule-behavior changes or deprecated plugin API calls in `eslint.config.mjs` if needed

## 5. Upgrade TypeScript 6

- [x] 5.1 Bump `typescript` to `6.0.3` in root `package.json`
- [x] 5.2 Run `npm install` to update lockfile
- [x] 5.3 Run `npm run build` — fix any type errors that surface (no `@ts-ignore` allowed)
- [x] 5.4 Run `npm run test` — confirm all tests pass
- [x] 5.5 Run `npm run lint` — confirm no new lint errors introduced by TS 6

## 6. Final Verification and Documentation

- [x] 6.1 Run `npm run build && npm run test && npm run lint` — full green pass across all projects
- [x] 6.2 Update `ROADMAP.md` P2 status to completed (✅) with date
