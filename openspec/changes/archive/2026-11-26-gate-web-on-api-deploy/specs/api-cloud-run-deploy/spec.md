## ADDED Requirements

### Requirement: A successful deploy job means the new revision is serving traffic

When the deploy steps run (change detection decided `deploy=true`), the deploy job SHALL end with a verification step, after `Deploy to Cloud Run`, that fails the job unless all of the following hold: the service's latest created revision is ready and is the latest ready revision; the image of the service template equals the image just deployed (`<region>-docker.pkg.dev/.../<package>:<github.sha>`); the entries of the service's traffic status that point at the latest ready revision add up to 100 percent; and `GET <service url>/api/v1/health` answers `200` (bounded retries, a short per-request timeout). The step SHALL read the state with `gcloud run services describe --format=json` using the credentials of the earlier authentication step, SHALL NOT call any provider endpoint, and SHALL be skipped when the deploy steps are skipped, so a run with no API change adds no time. The reason: the Vercel Deployment Check on this job is only meaningful if `success` implies the new code is live, and `gcloud run deploy` does not move traffic when the service traffic was pinned to a specific revision (for example after a manual rollback).

#### Scenario: Normal deploy passes the verification

- **GIVEN** a deploy whose new revision became ready and receives 100 percent of the traffic
- **WHEN** the verification step runs
- **THEN** it passes after the health request answers `200`, and the job finishes `success`

#### Scenario: Pinned traffic fails the job loudly

- **GIVEN** the service traffic is pinned to an older revision (manual rollback), so the new revision is ready but receives 0 percent
- **WHEN** the verification step runs
- **THEN** the job fails with a message naming the pinned revision and the fix (`gcloud run services update-traffic <service> --to-latest`), so the web production deployment stays held instead of being promoted against the old API

#### Scenario: Unhealthy service fails the job

- **GIVEN** a deploy that completed but the service URL does not answer `200` on `/api/v1/health` within the retries
- **WHEN** the verification step runs
- **THEN** the job fails

#### Scenario: No API change skips the verification

- **GIVEN** change detection decided `deploy=false`
- **WHEN** the job runs
- **THEN** the verification step is skipped and the job finishes `success`
