## 1. Spec alignment

- [x] 1.1 Update the NestJS exact pins in the `api-app-scaffold` requirement and its pin scenario to match `apps/api/package.json`
- [x] 1.2 Express the `@types/node` scenario of `ci-node-version` as the Node 24 major (`24.x`)

## 2. Verification

- [x] 2.1 `npx openspec validate sync-dependency-pins --strict` passes
- [x] 2.2 `npm ls @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/swagger @nestjs/config @nestjs/testing` resolves a single 12.x version each
