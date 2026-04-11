## MODIFIED Requirements

### Requirement: apps/web tsconfig includes only valid paths

`apps/web/tsconfig.json` MUST NOT include `"../../dist/apps/web/.next/types/**/*.ts"` in its `include` array. This path does not exist in the current workspace layout and causes phantom include resolution. The correct Next.js types path `"../../apps/web/.next/types/**/*.ts"` SHALL remain.

#### Scenario: web tsconfig resolves only real include paths

- **WHEN** the TypeScript compiler processes `apps/web/tsconfig.json`
- **THEN** no include glob resolves to a non-existent `dist/apps/web` path, and the compiler does not emit path resolution warnings

---

### Requirement: SVG module declarations use explicit React types

`apps/web/index.d.ts` MUST declare SVG module types without using `any`. The default export SHALL be typed as `string`. The named `ReactComponent` export SHALL be typed as `FC<SVGProps<SVGSVGElement>>`. The `eslint-disable` comment suppressing `no-explicit-any` MUST be removed.

#### Scenario: SVG import default export is a string

- **WHEN** a `.svg` file is imported with a default import
- **THEN** TypeScript resolves the type as `string` with no `any` in the type declaration

#### Scenario: SVG ReactComponent is typed as an FC

- **WHEN** `ReactComponent` is imported from a `.svg` file
- **THEN** TypeScript resolves the type as `FC<SVGProps<SVGSVGElement>>`

#### Scenario: No eslint-disable in index.d.ts

- **WHEN** ESLint runs on `apps/web/index.d.ts`
- **THEN** no `@typescript-eslint/no-explicit-any` suppression comment is present and the file passes lint without errors

---

### Requirement: layout.tsx imports React types explicitly

`apps/web/src/app/layout.tsx` MUST import `ReactNode` from `'react'` using a type import and use `ReactNode` directly in the `children` prop type annotation. The `React.ReactNode` form (referencing the global `React` namespace without an import) MUST NOT be used.

#### Scenario: layout.tsx compiles without React global reference errors

- **WHEN** TypeScript compiles `apps/web/src/app/layout.tsx`
- **THEN** there are no errors about `'React' refers to a UMD global` or missing React import

---

### Requirement: tsconfig.base.json has complete unused-variable strictness

`tsconfig.base.json` MUST set both `noUnusedLocals: true` and `noUnusedParameters: true`. The `customConditions` array MUST NOT be present (it is an unused NX scaffold placeholder).

#### Scenario: Unused function parameter is rejected

- **WHEN** a function is written with a parameter that is never referenced (not prefixed with `_`)
- **THEN** the TypeScript compiler reports an error and the build fails

#### Scenario: No customConditions in base tsconfig

- **WHEN** `tsconfig.base.json` is read
- **THEN** the `compilerOptions` object does not contain a `customConditions` key

---

### Requirement: .spec.swcrc files use CommonJS module output for Jest

`apps/api/.spec.swcrc` and `packages/shared/.spec.swcrc` MUST set `"module": { "type": "commonjs" }`. The value `"es6"` MUST NOT be used in these files, as Jest's runner requires CommonJS output.

#### Scenario: api specs compile to CommonJS

- **WHEN** SWC transpiles a spec file in `apps/api` using `.spec.swcrc`
- **THEN** the output uses CommonJS `require`/`module.exports` syntax, not ES module `import`/`export`

#### Scenario: shared specs compile to CommonJS

- **WHEN** SWC transpiles a spec file in `packages/shared` using `.spec.swcrc`
- **THEN** the output uses CommonJS syntax compatible with Jest's runner

#### Scenario: nx test api passes

- **WHEN** `npx nx test api` is executed
- **THEN** all tests pass without `SyntaxError: Cannot use import statement` errors

#### Scenario: nx test shared passes

- **WHEN** `npx nx test @eco-metrics/shared` is executed
- **THEN** all tests pass without module syntax errors

---

### Requirement: eslint.config.mjs does not broadly ignore .js files

`eslint.config.mjs` MUST NOT include `'**/*.js'` in the `ignores` array. Workspace-level `.js` configuration files (e.g., `jest.preset.js`, `commitlint.config.js`) SHALL be subject to ESLint. The `dist/**` pattern SHALL remain to exclude compiled output.

#### Scenario: jest.preset.js is linted

- **WHEN** ESLint runs on the workspace
- **THEN** `jest.preset.js` is not excluded by the ignores configuration

#### Scenario: dist files are still ignored

- **WHEN** ESLint runs on the workspace
- **THEN** files under `dist/` are still excluded by the `dist/**` ignore pattern
