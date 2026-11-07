# Tasks

## 1. Workflow

- [x] 1.1 Remove the `pull_request` trigger from `.github/workflows/ci.yml` and verify the
      `on:` block only declares `push: branches: ['**']`
- [x] 1.2 Set `BASE_SHA: ${{ github.event.before }}` in the `e2e_gate` step and in the
      `Detect api image changes` step, and verify `grep -n pull_request .github/workflows/ci.yml`
      returns nothing
- [x] 1.3 Run the workflow and detector tests (`npx nx test web --testPathPatterns=scripts`)
      and verify they pass with zero warnings

## 2. Docs

- [x] 2.1 Update the CI section of `README.md` so it says CI runs on every push and that a
      `develop` → `main` pull request shows the push run's checks, and verify no doc still
      claims CI runs on pull requests (`git grep -nE "PRs? to .?main|CI en PRs|pull_request"`
      over the docs, `ROADMAP.md` and `openspec/specs` only matches historical detector cases)

## 3. Integration checks

- [x] 3.1 Run `npm run format:check`, `npm run lint`, `npm run build` and `npm run test`, and
      verify all pass
- [x] 3.2 Run `npx openspec validate ci-push-only-trigger --strict` and verify the change is
      valid

## Workflow follow-up

- Archive the change with `npx openspec archive ci-push-only-trigger --yes` after review.
- After the first push to `develop` and the next `develop` → `main` pull request, confirm in
  GitHub Actions that the pull request started no extra run and shows the push run's checks.
