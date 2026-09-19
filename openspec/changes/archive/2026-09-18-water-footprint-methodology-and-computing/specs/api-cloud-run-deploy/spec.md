# Spec Delta: api-cloud-run-deploy

> **Already applied.** Unlike the other deltas in this change, this one was applied directly to
> `openspec/specs/api-cloud-run-deploy/spec.md` in commit `f5f6d37`, not at archive time. It is
> recorded here for completeness; archiving it requires no further edit to the canonical spec.

## MODIFIED Requirements

Both requirements below change **only** the asserted water-footprint product count, from 52 to 53
(the dataset drops 4 unverifiable entries and gains 5 `Digital & Computing` entries). No deployment
behaviour, no other statement and no other scenario in either requirement is affected.

### Requirement: Multi-stage Docker image builds a self-contained apps/api runtime

Unchanged except for the product count in the "Self-contained runtime boots without the workspace"
scenario.

#### Scenario: Self-contained runtime boots without the workspace

- **GIVEN** the built runtime image (or an equivalent extraction of `apps/api/dist` with its `node_modules`) placed in isolation, with no parent `node_modules` and no workspace files
- **WHEN** `PORT=8080 NODE_ENV=production CORS_ORIGIN=<url> SWAGGER_ENABLED=false node main.js` runs
- **THEN** the NestJS app starts and listens on the injected `PORT`
- **AND** `GET /api/v1/health` returns `200` with `{ "status": "ok" }`
- **AND** `GET /api/v1/water-footprint/products` returns `200` with `success: true` and 53 products

### Requirement: Post-deploy verification proves the deployed BFF end-to-end

The runbook SHALL define the user-executed verification (curl + browser — not automated specs): `GET /api/v1/health` on the deployed `*.run.app` URL returns `200` `{ "status": "ok" }`; `GET /api/v1/water-footprint/products` returns `success: true` with 53 products; after setting `API_BASE_URL=https://<run-url>/api/v1` in Vercel (Production AND Preview) and a redeploy (or ISR self-heal within 24 h), the deployed `/water-footprint/` page renders the product table from the deployed BFF.

Its "Health on the deployed URL" and "The deployed web page renders from the deployed BFF" scenarios
are unchanged.

#### Scenario: Full dataset on the deployed URL

- **WHEN** `curl https://<run-url>/api/v1/water-footprint/products` runs
- **THEN** the response is `200` with `success: true` and `data` containing 53 products
