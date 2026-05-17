# Proposal: Upgrade to Node.js 24

## What

Upgrade the project runtime and all CI/CD tooling from Node.js 20 to Node.js 24 LTS.

## Why

GitHub Actions deprecated Node.js 20 as the runtime for JavaScript actions. Starting **June 2, 2026**, actions that still target Node 20 will be forced to run under Node 24. Node 20 will be fully removed from runners on **September 16, 2026**.

Upgrading now eliminates deprecation warnings in CI, ensures parity between local development and CI, and aligns the project with the current LTS release.

## Scope

- CI workflows (`ci.yml`, `release.yml`)
- Local Node version pin (`.nvmrc`)
- TypeScript type definitions (`@types/node`)
- Root `README.md` documentation

## Out of scope

- No application code changes — all dependencies are already on 2025 releases that ship Node 24 prebuilds.
- No new features or refactors.
