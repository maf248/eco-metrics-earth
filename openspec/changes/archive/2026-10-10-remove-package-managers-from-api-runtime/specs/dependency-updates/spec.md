## ADDED Requirements

### Requirement: Dependabot alerts are on and automated security-fix PRs are off

The repository SHALL have Dependabot alerts enabled, so known vulnerabilities in the dependency manifests surface in the Security tab. Dependabot automated security-fix PRs SHALL stay disabled: GitHub always opens them against the default branch (`main`), which only receives PRs from `develop`. Fixes for alerts are applied on `develop` like any other change.

#### Scenario: Alerts enabled, security-fix PRs disabled

- **WHEN** the repository settings are read through the GitHub API
- **THEN** `GET /repos/{owner}/{repo}/vulnerability-alerts` returns `204`
- **AND** `GET /repos/{owner}/{repo}/automated-security-fixes` returns `enabled: false`
