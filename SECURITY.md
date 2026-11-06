# Security Policy

## Supported Versions

eco-metrics earth is a continuously deployed application, not a published package. Security fixes are developed on `develop` and shipped to production in a new release from `main`; they are not backported to older releases.

| Version                     | Supported |
| --------------------------- | --------- |
| Latest release (production) | Yes       |
| Older releases              | No        |

## Reporting a Vulnerability

**Please do not open a public issue, pull request, or discussion for a security problem.**

Report it privately through GitHub's [private vulnerability reporting](https://github.com/maf248/eco-metrics-earth/security/advisories/new) (repository **Security** tab → **Report a vulnerability**).

Include as much of the following as you can:

- The affected component (web app, API) and URL or endpoint
- Steps to reproduce, or a proof of concept
- The impact you expect (for example, data exposure or bypassing the API key)

## What to Expect

This project is maintained on a best-effort basis, so there are no guaranteed response times. Every report is read, and confirmed vulnerabilities are fixed and disclosed through a GitHub security advisory, crediting the reporter unless they prefer to stay anonymous.

## Scope

In scope: the code in this repository and its deployments (the web app and the API).

Out of scope:

- Vulnerabilities in third-party data providers or hosting platforms — report those to their owners
- Denial-of-service or load testing against the production deployments
- Known advisories in development-only dependencies that are already tracked
