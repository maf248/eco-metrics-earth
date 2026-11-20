# Proposal

## Why

The canonical `nx-workspace` spec pins the NX release by number: it requires every `nx` /
`@nx/*` package at exactly `23.2.1`. The workspace is on `23.3.1` since a routine minor
dependency bump, which the project handles without a spec, so the spec now states something
false. Any future patch or minor bump would make it drift again.

What the spec has to guarantee is the policy, not the number: NX 23, one exact version for the
whole family, no ranges. The number already lives in the root `package.json` and in the README
tech-stack table, which the project keeps up to date.

The "Run all monorepo tests" scenario has the same problem with a hard-coded test count
(279), long outdated.

## What Changes

- "NX workspace initialized with apps and packages": NX 23 with the whole family pinned to one
  exact version in lockstep, instead of `23.2.1`; the start scenario no longer names a release;
  the test scenario no longer states a test count.
- "NX toolchain free of known auditable vulnerabilities": the audit scenario no longer names a
  release.
- "Toolchain operation without warnings on NX 23": the lockstep scenario requires the ten NX
  family packages to share one exact 23.x version, instead of `"23.2.1"`.

## Non-Goals

- No dependency, config or code change: the workspace already satisfies the restated spec.
- A major NX upgrade still needs its own spec, as `AGENTS.md` requires.

## Impact

- Specs: `nx-workspace` (three requirements modified, wording only).
