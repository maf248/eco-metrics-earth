# Spec: CI Node Version

## Capability

The CI pipeline runs on Node.js 24 without deprecation warnings, and the local dev environment pins to the same version.

---

## Scenario 1 — CI workflow uses Node 24

**Given** a push or pull request triggers the `ci.yml` workflow  
**When** the `Setup Node.js` step runs  
**Then** the runner environment has Node.js 24 available  
**And** no "Node.js 20 actions are deprecated" warning appears in the job log  

---

## Scenario 2 — Release workflow uses Node 24

**Given** a push to `main` triggers the `release.yml` workflow  
**When** the `Setup Node.js` step runs  
**Then** the runner environment has Node.js 24 available  
**And** no "Node.js 20 actions are deprecated" warning appears in the job log  

---

## Scenario 3 — Local dev pins to Node 24

**Given** a developer runs `nvm use` in the repo root  
**When** nvm reads `.nvmrc`  
**Then** it activates Node.js 24  

---

## Scenario 4 — TypeScript types match the runtime

**Given** the project runs on Node.js 24  
**When** TypeScript resolves `@types/node`  
**Then** the installed version is `24.12.4`  
**And** `npm run typecheck` exits with code 0  
