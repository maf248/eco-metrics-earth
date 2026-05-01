# Tasks — fix-critical-config

## 1. NX Configuration

- [x] 1.1 In `nx.json`, remove the `"{workspaceRoot}/.eslintrc.json"` and `"{workspaceRoot}/.eslintignore"` entries from the `lint` target `inputs` array and replace them with `"{workspaceRoot}/eslint.config.mjs"`
- [x] 1.2 Run `npx nx run-many --target=lint --all` and confirm it exits with zero errors

## 2. API TypeScript Config

- [x] 2.1 In `apps/api/tsconfig.app.json`, add `"emitDeclarationOnly": false` to `compilerOptions` to override the root `tsconfig.base.json` value
- [x] 2.2 In `apps/api/tsconfig.app.json`, add `"module": "commonjs"` and `"moduleResolution": "node"` to `compilerOptions` to override the root NodeNext settings
- [x] 2.3 Run `tsc --noEmit -p apps/api/tsconfig.app.json` and confirm it exits with code 0 and reports no errors

## 3. API Webpack Config

- [x] 3.1 In `apps/api/webpack.config.js`, change `generatePackageJson: false` to `generatePackageJson: true` in the `NxAppWebpackPlugin` options
- [x] 3.2 Run `npx nx build api` and confirm that `dist/apps/api/package.json` is present in the output

## 4. Dependency Declarations

- [x] 4.1 In `apps/web/package.json`, change `"next": "~16.1.6"` to `"next": "16.1.7"` (exact pin, no range qualifier)
- [x] 4.2 In `apps/api/package.json`, add `"@nestjs/config": "4.0.4"` to the `dependencies` object (exact pin, not in `devDependencies`)
- [x] 4.3 Run `npm install` at the workspace root to update `package-lock.json` and confirm it completes without errors

## 5. Final Verification

- [x] 5.1 Run `npm run build` and confirm it exits with zero errors across all projects
- [x] 5.2 Run `npm run test` and confirm it exits with zero errors and zero warnings across all projects
- [x] 5.3 Run `npm run lint` and confirm it exits with zero errors across all projects
