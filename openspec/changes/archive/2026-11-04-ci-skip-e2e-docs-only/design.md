# Design: Skip E2E on docs-only changes when the base is green

## Technical approach

### Flow in the `ci` job

```
Checkout (fetch-depth: 0)
  ... install, verify image, format, lint, typecheck, build, prune, Test ...
Decide whether E2E can be skipped   (id: e2e_gate, always runs)
E2E                                  (if: steps.e2e_gate.outputs.skip_e2e != 'true')
```

The detection step sits right before `E2E` (after `Test`) so that a detector crash can never prevent the cheaper gates from running. If the step itself errors, its output is unset and `!= 'true'` evaluates true, so E2E runs. The detector also exits 0 on every path.

Step environment (all from the automatic context):

- `BASE_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.base.sha || github.event.before }}` (same expression as the `api-image` job)
- `HEAD_SHA: ${{ github.sha }}`
- `GITHUB_TOKEN: ${{ github.token }}`; `GITHUB_REPOSITORY` and `GITHUB_API_URL` are set by the runner
- `CI_CHECK_NAME: Format, Lint, Typecheck, Build & Test`, placed next to the existing CONTRACT comment, which is extended to say the name is also read by the detector. `job.name` is not available in the expression contexts, so a literal is unavoidable; the value is passed once via env, never hard-coded in the script.

Job `permissions` becomes `contents: read` + `checks: read` (job-level permissions replace the workflow-level block, so `contents: read` must be repeated). Containers run the step with the job's token; no other change to the container is needed.

### Detector: new Node script, `scripts/detect-e2e-skip.cjs`

Structure:

- `decide(inputs)`: pure function over `{ baseSha, headSha, changedFiles | error, pattern | error, baseCheck: { conclusions } | error }` returning `{ skip, reason, matched, nonDocs }`. No I/O.
- `run(deps)`: wiring with injectable `env`, `git` (runner), `readFile`, `fetch`, `stdout`, `appendFile`. Steps in order, short-circuiting to "run" at the first doubt: base empty/all-zero -> `git cat-file -e BASE^{commit}` -> `git -c core.quotePath=false diff --no-renames --name-only BASE HEAD` (rename detection off, so a moved file lists its old path too) -> read the pattern file from the base revision (`git show BASE:scripts/docs-only-paths.pattern`; a change cannot widen the pattern that judges it) -> force `scripts/docs-only-paths.pattern`, `scripts/detect-e2e-skip.cjs` and `.github/workflows/ci.yml` to non-docs -> compile `RegExp` per line and test each path -> only if the diff is docs-only (and non-empty), call the API. Skipping the API call on non-docs diffs saves a request and keeps the common path offline.
- API call: `fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/commits/${BASE_SHA}/check-runs?check_name=${encodeURIComponent(name)}&filter=latest&app_id=15368&per_page=100`)` (15368 = GitHub Actions app; other apps' checks of the same name are ignored) with headers `Authorization: Bearer`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version`, and `AbortSignal.timeout(10000)`. Skip only if `response.ok`, the JSON has a non-empty `check_runs` array, and **every** entry has `conclusion === 'success'`. `filter=latest` keeps only the most recent attempt per check suite, so a successful re-run after a failure counts as green, while a `push` run and a `pull_request` run on the same SHA are both required to be green. A `total_count` larger than the returned array is a doubt. Anything else (an empty array, any non-success or `null` conclusion, thrown error, timeout) runs E2E.

Why every run and not any run: a `pull_request` run tests the merge of the PR head with its base branch, yet its check run is attached to the head SHA. If the head's own `push` run failed and the `pull_request` run passed (because the base branch brought a fix), "any success" would trust a tree that was never tested as such.

- Pattern file: `scripts/docs-only-paths.pattern`, mirroring `api-image-inputs.pattern`, it holds a single line `\.md$|^openspec/`, compiled with `new RegExp(line)`. The pattern must stay valid both as an ERE and as a JS regex (the common subset), so it remains greppable. A compile error maps to "run".
- Output: `skip_e2e=true|false` to `GITHUB_OUTPUT`; stdout log and `GITHUB_STEP_SUMMARY` block with base, head, matched files, non-docs files, base check conclusion(s), decision and reason (same layout as `detect-api-image-changes.sh`).
- CLI guard: `if (require.main === module) run(realDeps)`; the module exports `decide` and `run` for tests.

### Why induction makes the skip safe

A CI run whose E2E was skipped can exist only if its own base was green. By induction, a green base implies the base tree was covered by a real E2E pass at some earlier revision, followed only by docs-only diffs (which cannot change runtime behaviour or tests; the Jest suite still runs and covers `docs/*.md`-reading tests). So "base green + docs-only diff" implies the head tree is E2E-equivalent to a tree that passed E2E. `git diff A B` compares trees, not histories, so force-pushes, rebases and merges are handled: if the base commit is absent from the clone we run; if present, the tree diff is exact.

### Documentation changes

- `AGENTS.md` "CI/CD gates": new bullet describing the docs-only E2E skip, the pattern file `scripts/docs-only-paths.pattern` (edit there, never inline), step-level gating only, the `checks: read` permission and the fail-safe (any doubt runs E2E).
- `docs/deploy/vercel.md`: one sentence under "What is and is not gated" / job-name coupling: on docs-only commits the job still runs and reports, only its `E2E` step is skipped.
- `ROADMAP.md`: in the E2E sharding item remove sub-step (1) (do not run E2E on docs-only commits), renumber the remaining parenthesised steps (1), (2) inside the text, keep it Spanish; the item remains so no ID renumbering.

## Alternatives considered

1. **Generalise `detect-api-image-changes.sh`** (bash, parametrised by pattern and mode). Rejected: the new detector needs an authenticated HTTP call with timeout and JSON parsing, which in bash means `curl` and `jq`/`gh`, none guaranteed in the Playwright container (Node is). It also inverts the polarity (all paths must match vs any path matches) and would complicate a script whose tests and consumers (`deploy-api.yml`) are stable. The duplicated logic is small (empty/zero base, `cat-file`, `git diff`), and the reuse cost is accepted; the two scripts intentionally mirror each other's fail-safe ordering and reporting format.
2. **Node script that also replaces the bash detector.** Rejected: out of scope, touches the api-image gate.
3. **`.mjs` instead of `.cjs`.** The repo already has `check-playwright-image.mjs`, but Jest in `apps/web` is CommonJS and importing ESM from tests needs extra config. `.cjs` allows `require` of the pure functions with injected stubs. Behaviour is identical in the container.
4. **`gh` CLI or `curl`.** Not guaranteed in the container; would need installing packages (the job deliberately avoids `apt`).
5. **`paths-ignore` or a job-level `if`.** Rejected: a skipped or never-created job does not report the contract check, so Vercel Deployment Checks would wait forever and `deploy-api-*` would be skipped.
6. **Use `actions/github-script` or a third-party paths-filter action.** Adds a dependency and cannot be unit-tested here; the logic is small.
7. **Skip when only the diff is docs-only (no base-green condition).** Rejected: a red or untested base would then be hidden behind a green docs commit. The base-green condition is what makes a skipped E2E sound.
8. **Detect via `github.event.head_commit` or the commits list.** Rejected: push payload lists are truncated and miss the whole-push diff semantics.

## Risk assessment

| Risk                                                                              | Mitigation                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| False skip hides an E2E regression                                                | Two independent conditions; every doubt runs; exit 0 and unset-output both mean "run"; induction argument above                                                                 |
| Code push still running CI when a docs push follows (cancel-in-progress)          | The base check is `in_progress`/`cancelled`, not `success` -> runs. Cost: one extra E2E, accepted                                                                               |
| `checks: read` missing or API 403                                                 | Treated as API failure -> runs; spec scenario covers non-2xx                                                                                                                    |
| Check name drift (job renamed)                                                    | No matching check run -> runs; name is passed from one env value beside the CONTRACT comment                                                                                    |
| `chore(release)` `[skip ci]` base                                                 | No check run on that SHA -> the next docs commit runs E2E once; acceptable                                                                                                      |
| Docs-only pattern too broad (e.g. a `.md` file read by an E2E test or by code)    | Jest still runs everything; E2E fixtures are not `.md`. Pattern lives in one file so it can be narrowed                                                                         |
| `pull_request` check run on the base SHA tested a merge tree, not the base itself | Every latest check run on the base must be `success`; a failed `push` run on the same SHA runs E2E                                                                              |
| A change widens the docs-only pattern or renames code into `docs/`                | Pattern read from `BASE_SHA`; control files always non-docs; `--no-renames`. The script itself runs from the head, so editing it remains a code-review concern like any CI code |
| Hung API call slows the job                                                       | 10 s `AbortSignal.timeout`                                                                                                                                                      |
| Rate limits                                                                       | One request per run, `GITHUB_TOKEN` limit is 1000/h per repo                                                                                                                    |
| Stale expectation that E2E always ran                                             | AGENTS.md updated; step summary states the decision on every run                                                                                                                |

## Verification on real CI

After merging to `develop`: (1) push a docs-only commit after a green run -> summary shows `skip_e2e=true`, E2E step "skipped", job green; (2) push a docs-only commit right after a code push (CI still running or cancelled) -> `skip_e2e=false` naming the base check state.
