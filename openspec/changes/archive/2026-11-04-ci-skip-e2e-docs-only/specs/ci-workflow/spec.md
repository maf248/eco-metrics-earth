## ADDED Requirements

### Requirement: The E2E step is skipped for docs-only changes on a green base

The `ci` job SHALL run a detection step after checkout and before the `E2E` step. The `E2E` step SHALL be gated by a step-level `if:` on the detection step's output, never by a job-level `if` and never by `paths-ignore`. The E2E step SHALL be skipped only when BOTH conditions hold: (a) every path changed between `BASE_SHA` and `HEAD_SHA` matches the docs-only pattern, and (b) the CI check named `Format, Lint, Typecheck, Build & Test` has at least one latest check run on `BASE_SHA` and every latest check run has conclusion `success`. `BASE_SHA` SHALL be `github.event.pull_request.base.sha` on `pull_request` and `github.event.before` on `push`; `HEAD_SHA` SHALL be `github.sha`. The job itself SHALL always run and report its own conclusion; Format check, lint, typecheck, build, the API prune checks and unit tests SHALL run regardless of the decision.

#### Scenario: Docs-only push on a green base skips E2E

- **GIVEN** a push whose diff `BASE_SHA..HEAD_SHA` contains only `*.md` and `openspec/` paths
- **AND** the CI check on `BASE_SHA` concluded `success`
- **WHEN** the `ci` job runs
- **THEN** the `E2E` step is skipped
- **AND** the job `Format, Lint, Typecheck, Build & Test` still runs and concludes `success`

#### Scenario: Push containing code runs E2E

- **GIVEN** a push whose diff contains at least one path that is not `*.md` and not under `openspec/`
- **WHEN** the detection step runs
- **THEN** it decides to run E2E and lists the non-docs files

#### Scenario: Multi-commit push containing code runs E2E

- **GIVEN** a push of three commits (code, code, docs) whose `BASE_SHA` is the tip before the push
- **WHEN** the detection step diffs `BASE_SHA..HEAD_SHA`
- **THEN** the diff includes the code files
- **AND** E2E runs even though the last commit is docs-only

#### Scenario: Docs-only pull request on a green base skips E2E

- **GIVEN** a `pull_request` event whose diff against `github.event.pull_request.base.sha` is docs-only
- **AND** the CI check on that base SHA concluded `success`
- **WHEN** the `ci` job runs
- **THEN** the `E2E` step is skipped and the job still reports

#### Scenario: Unit tests, build and lint always run on docs-only changes

- **GIVEN** a docs-only change on a green base
- **WHEN** the `ci` job runs
- **THEN** the format check, lint, typecheck, build, API prune checks and unit tests all execute
- **AND** only the `E2E` step is skipped

### Requirement: The docs-only pattern has a single source

The docs-only path pattern SHALL live only in `scripts/docs-only-paths.pattern` (a single regular expression valid both as an ERE and as a JavaScript regex, matching `\.md$` and `^openspec/`), never inlined in `ci.yml` or in the script. The detector SHALL read the pattern as it exists at `BASE_SHA` (`git show <BASE_SHA>:scripts/docs-only-paths.pattern`), never from the checked-out head, so a change cannot widen the pattern that judges it; a base without the file is a doubt. The paths `scripts/docs-only-paths.pattern`, `scripts/detect-e2e-skip.cjs` and `.github/workflows/ci.yml` SHALL always count as non-docs, whatever the pattern says. The changed paths SHALL be listed with rename detection disabled (`git diff --no-renames --name-only`), so a moved file contributes both its old and its new path. The pattern SHALL NOT be derived from `scripts/vercel-ignore.sh`. A change SHALL count as docs-only only when ALL changed paths match.

#### Scenario: Only documentation paths match

- **GIVEN** a diff containing `README.md`, `docs/guide.md` and `openspec/changes/x/proposal.md`
- **WHEN** the detector evaluates it
- **THEN** all paths match and the diff is docs-only

#### Scenario: A single non-matching path defeats the skip

- **GIVEN** a diff containing `docs/guide.md` and `apps/api/src/main.ts`
- **WHEN** the detector evaluates it
- **THEN** the diff is not docs-only and E2E runs

#### Scenario: Changes to the detector itself run E2E

- **GIVEN** a diff containing `.github/workflows/ci.yml`, `scripts/docs-only-paths.pattern` or `scripts/detect-e2e-skip.cjs`
- **WHEN** the detector evaluates it
- **THEN** E2E runs, because these paths always count as non-docs

#### Scenario: A change cannot widen its own pattern

- **GIVEN** a push that changes `scripts/docs-only-paths.pattern` to match every path and also edits `apps/api/src/main.ts`
- **WHEN** the detector evaluates it
- **THEN** the pattern used is the one at `BASE_SHA`
- **AND** E2E runs

#### Scenario: A code file renamed into a docs path runs E2E

- **GIVEN** a push that moves `apps/api/src/x.ts` to `docs/x.md`
- **WHEN** the detector lists the changed paths
- **THEN** both `apps/api/src/x.ts` and `docs/x.md` are listed
- **AND** E2E runs

### Requirement: A skip requires a green base CI check

The detector SHALL query the GitHub REST API `GET /repos/{owner}/{repo}/commits/{BASE_SHA}/check-runs?check_name=<name>&filter=latest&app_id=15368` (15368 is the GitHub Actions app, so a check of the same name created by another app is ignored) using native `fetch` with a short timeout and the automatic `GITHUB_TOKEN`, where `<name>` comes from an environment variable set in `ci.yml` next to the name-contract comment (not hard-coded in the script). It SHALL count the base as green only when the response contains at least one check run and every returned check run has conclusion `success`. With `filter=latest` only the most recent attempt per check suite is returned, so a successful re-run after a failure counts as green. A response whose `total_count` exceeds the number of returned check runs SHALL be treated as a doubt. The `ci` job SHALL declare `permissions` with `contents: read` and `checks: read`. No secret, PAT or repository setting SHALL be required.

#### Scenario: Base check failed

- **GIVEN** a docs-only diff
- **AND** the only check run on `BASE_SHA` has conclusion `failure`
- **WHEN** the detector decides
- **THEN** E2E runs and the reason mentions the base conclusion

#### Scenario: Base check cancelled or in progress

- **GIVEN** a docs-only diff
- **AND** the check run on `BASE_SHA` has conclusion `cancelled`, or is `in_progress` with a null conclusion
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: Base check re-run succeeded

- **GIVEN** a docs-only diff
- **AND** a failed check run on `BASE_SHA` was re-run in the same check suite and the latest attempt concluded `success`
- **WHEN** the detector decides
- **THEN** the base counts as green and E2E is skipped

#### Scenario: Push run failed while the pull request run passed

- **GIVEN** a docs-only diff
- **AND** the latest check runs on `BASE_SHA` are a `failure` from the `push` event and a `success` from the `pull_request` event (which tested a merge tree)
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: Base has no matching check run

- **GIVEN** a docs-only diff
- **AND** `BASE_SHA` has no check run with the CI job name (for example a `chore(release)` commit pushed with `[skip ci]`, or the job was renamed)
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: GitHub API failure runs E2E

- **GIVEN** a docs-only diff
- **AND** the API call times out, rejects, answers non-2xx, or returns an unparsable body
- **WHEN** the detector decides
- **THEN** E2E runs and the reason states the API failure
- **AND** the detector exits 0

### Requirement: Any doubt runs E2E

The detector SHALL decide to run E2E whenever it cannot prove that skipping is safe: empty or all-zero `BASE_SHA` (new branch), `BASE_SHA` not present in the clone (force-push), `git diff` failure, missing or unreadable pattern file, pattern error, empty diff, missing `GITHUB_TOKEN` or `GITHUB_REPOSITORY`, or any base check state other than a `success` conclusion. The detector SHALL always exit 0 and write `skip_e2e=true|false` to `GITHUB_OUTPUT`; the only decision that skips E2E is the one backed by both conditions of the previous requirements.

#### Scenario: New branch runs E2E

- **GIVEN** `BASE_SHA` is empty or `0000000000000000000000000000000000000000`
- **WHEN** the detector decides
- **THEN** E2E runs with the reason "no base revision"

#### Scenario: Base not in history runs E2E

- **GIVEN** `BASE_SHA` is not a commit in the clone (for example after a force-push)
- **WHEN** the detector decides
- **THEN** E2E runs without calling the API

#### Scenario: Git diff failure runs E2E

- **GIVEN** `git diff --name-only` fails
- **WHEN** the detector decides
- **THEN** E2E runs

#### Scenario: Missing pattern file runs E2E

- **GIVEN** `scripts/docs-only-paths.pattern` is missing or unreadable
- **WHEN** the detector decides
- **THEN** E2E runs

### Requirement: The skip decision is reported

The detector SHALL print to stdout and append to `GITHUB_STEP_SUMMARY` the base SHA, head SHA, the matched docs files, the non-docs files, the base check conclusion, and the decision with its reason.

#### Scenario: Summary of a skip

- **GIVEN** a docs-only push on a green base
- **WHEN** the detector finishes
- **THEN** the step summary lists base, head, matched files, base conclusion `success` and `Decision: skip_e2e=true` with the reason

#### Scenario: Summary of a run

- **GIVEN** a docs-only push right after a code push whose CI is still in progress
- **WHEN** the detector finishes
- **THEN** the step summary shows `skip_e2e=false` and a reason naming the base check state
