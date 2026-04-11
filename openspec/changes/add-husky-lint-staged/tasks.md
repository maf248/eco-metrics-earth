## 1. Install Dependencies

- [x] 1.1 Install `husky` and `lint-staged` as devDependencies in root `package.json` (pinned versions, no `^`)

## 2. Configure Husky

- [x] 2.1 Run `npx husky init` to scaffold `.husky/` directory and add `prepare` script to `package.json`
- [x] 2.2 Verify `.husky/pre-commit` was created; replace its content with the lint-staged invocation: `npx lint-staged`

## 3. Configure lint-staged

- [x] 3.1 Add `lint-staged` config to root `package.json` with the following glob → command mapping:
  - `**/*.{ts,tsx,js}` → `["eslint --fix", "prettier --write"]`
  - `**/*.json` → `["prettier --write"]`

## 4. Verify Hook Works End-to-End

- [x] 4.1 Run `npm install` and confirm the `prepare` script executes without errors
- [x] 4.2 Stage a file with a formatting issue and run `git commit` — confirm lint-staged auto-fixes and allows the commit
- [x] 4.3 Stage a file with an unfixable ESLint error and run `git commit` — confirm the commit is rejected with a clear error message
- [x] 4.4 Run `npm run build` and `npm run test` to confirm no regressions from the config changes
