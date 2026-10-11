# Tasks: Remove package managers from the API runtime image

- [x] 1. Confirm no runtime code shells out to a package manager: `grep -rnE "(exec|spawn|fork)[A-Za-z]*\(.*(npm|npx|yarn|corepack)" apps/api/src packages/shared/src` returns nothing.
- [x] 2. In the runtime stage of `/Dockerfile`, add the `RUN rm -rf ...` with its comment exactly as in `design.md` D1, right after the runtime `FROM` and before `ENV NODE_ENV=production`. Change nothing else.
- [x] 3. `apps/api/README.md`: in the image paragraph, add that the runtime stage removes npm, npx, corepack and yarn (not needed to run `node main.js`).
- [x] 4. `AGENTS.md` "Dependency Management": add one bullet saying Dependabot alerts are enabled (Security tab), automated security-fix PRs are disabled because GitHub always opens them against `main`, and alert fixes are applied manually on `develop`.
- [x] 5. Gates: `npm run format:check`, `npm run lint`, `npm run build`, `npm run test`; `npx openspec validate remove-package-managers-from-api-runtime --strict`.

## Post-merge verification (manual, for the user; not a coder task)

- Image verification is post-merge (see `design.md` Verification): dev deploy healthy, and optionally `sudo docker build` locally.
