## ADDED Requirements

### Requirement: A runbook documents the manual Sentry setup

`docs/deploy/sentry.md` SHALL document, with exact click paths, the steps that are not code: creating the organization auth token and its scope, where each secret and variable is stored (GitHub and Vercel), the alert rules, the client-key rate limits and the uptime monitor. It SHALL state that the token is never pasted into chat, a file or a commit.

#### Scenario: Token and storage steps are documented

- **WHEN** a maintainer follows the runbook
- **THEN** it names the token type and scope, the Vercel variable `SENTRY_AUTH_TOKEN` (Production and Preview, sensitive) and the GitHub variable `SENTRY_DSN_API`, and states that no GitHub secret is needed

#### Scenario: Variables and DSN placement are documented

- **WHEN** a maintainer follows the runbook
- **THEN** it lists `NEXT_PUBLIC_SENTRY_DSN` for Vercel Production and Preview, explains that the Vercel build must be redeployed to apply it, and explains why DSNs are variables and not committed

### Requirement: The runbook defines alerts, quota guards and uptime

The runbook SHALL define, per Sentry project, an issue alert for a new issue and for a regression in the `production` environment, an issue alert for an issue seen more than a stated number of times in one hour, a client-key rate limit as a daily backstop, and a single uptime monitor on the production web URL with the reason for that target. All SHALL notify by email.

#### Scenario: Alert rules are listed

- **WHEN** the runbook alert section is read
- **THEN** it gives the rule names, conditions, the `production` environment filter, the action and the number of times used for the frequency rule, for both projects

#### Scenario: Uptime target is justified

- **WHEN** the runbook uptime section is read
- **THEN** it names the production web URL as the monitor target and explains that API outages already surface as web server errors

### Requirement: Existing docs and examples describe the new configuration

`apps/api/.env.example`, `apps/web/.env.example` and the environment tables of `README.md` SHALL list every new variable, and `docs/deploy/cloud-run.md`, `docs/deploy/vercel.md` and `AGENTS.md` SHALL link to or summarize the Sentry conventions, including that `AllExceptionsFilter` is the only API capture point.

#### Scenario: Env documentation is in sync

- **WHEN** the env examples and README tables are compared with the API schema and the web code
- **THEN** `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` each appear with a default and a description
