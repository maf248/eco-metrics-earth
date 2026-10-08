## REMOVED Requirements

### Requirement: robots.txt disallows crawling of API paths

**Reason**: The web domain serves no `/api/` routes — the BFF runs on Cloud Run under its own domain, which a robots.txt on the web domain cannot govern anyway — so the rule blocked nothing. It also contradicted the `robots` capability and forced `robots.ts` to emit two separate `User-agent: *` groups.
**Migration**: None required. `robots.txt` is fully specified by the `robots` capability (one `User-agent: *` group with `Allow: /` plus the sitemap). If route handlers under `/api/` are ever added to the web app, reintroduce a disallow rule in the `robots` capability.
