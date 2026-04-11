# Tasks — fix-critical-config

## 1. NX Configuration

- [ ] 1.1 In `nx.json`, remove the `"{workspaceRoot}/.eslintrc.json"` and `"{workspaceRoot}/.eslintignore"` entries from the `lint` target `inputs` array and replace them with `"{workspaceRoot}/eslint.config.mjs"`
- [ ] 1.2 Run `npx nx run-many --target=lint --all` and confirm it exits with zero errors

## 2. API TypeScript Config

- [ ] 2.1 In `apps/api/tsconfig.app.json`, add `"emitDeclarationOnly": false` to `compilerOptions` to override the root `tsconfig.base.json` value
- [ ] 2.2 In `apps/api/tsconfig.app.json`, add `"module": "commonjs"` and `"moduleResolution": "node"` to `compilerOptions` to override the root NodeNext settings
- [ ] 2.3 Run `tsc --noEmit -p apps/api/tsconfig.app.json` and confirm it exits with code 0 and reports no errors

## 3. API Webpack Config

- [ ] 3.1 In `apps/api/webpack.config.js`, change `generatePackageJson: false` to `generatePackageJson: true` in the `NxAppWebpackPlugin` options
- [ ] 3.2 Run `npx nx build api` and confirm that `dist/apps/api/package.json` is present in the output

## 4. Dependency Declarations

- [ ] 4.1 In `apps/web/package.json`, change `"next": "~16.1.6"` to `"next": "16.1.7"` (exact pin, no range qualifier)
- [ ] 4.2 In `apps/api/package.json`, add `"@nestjs/config": "4.0.4"` to the `dependencies` object (exact pin, not in `devDependencies`)
- [ ] 4.3 Run `npm install` at the workspace root to update `package-lock.json` and confirm it completes without errors

## 5. Final Verification

- [ ] 5.1 Run `npm run build` and confirm it exits with zero errors across all projects
- [ ] 5.2 Run `npm run test` and confirm it exits with zero errors and zero warnings across all projects
- [ ] 5.3 Run `npm run lint` and confirm it exits with zero errors across all projects
