# Spec Delta: api-cloud-run-deploy

## MODIFIED Requirements

### Requirement: Deploy verification product count

The deploy-verification steps that assert the water-footprint dataset size SHALL expect **53** products, not 52 — the dataset moves from 52 to 53 entries in this change (4 unverifiable entries removed, 5 `Digital & Computing` entries added).

This affects the smoke-check scenario and the runbook's user-executed verification text in `openspec/specs/api-cloud-run-deploy/spec.md`. No deployment behaviour changes; only the asserted count.

#### Scenario: Deployed products endpoint smoke check

- **WHEN** `GET /api/v1/water-footprint/products` is called on the deployed `*.run.app` URL
- **THEN** the response is `200` with `success: true` and `data` containing 53 products
