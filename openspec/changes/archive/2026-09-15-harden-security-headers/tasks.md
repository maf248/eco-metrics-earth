# Tasks: Harden Security Headers

## Implementation (@coder)

- [x] 1. In `apps/web/next.config.ts`, append the following entries to the existing `csp` array, after `"frame-ancestors 'none'"` and before the `.join('; ')` call: `"base-uri 'self'"`, `"form-action 'self'"`, `"object-src 'none'"`, `"frame-src 'none'"` unconditionally, then append `upgrade-insecure-requests` **only in production** by spreading the existing `isDev` flag, e.g. `...(isDev ? [] : ['upgrade-insecure-requests'])`. Do not modify `default-src`, `scriptSrc`, `style-src`, `font-src`, `img-src` or `connect-src`, and leave the pre-existing `isDev` branch that toggles `'unsafe-eval'` in `scriptSrc` exactly as it is — the gate above is a second, independent use of the same flag.
- [x] 2. In `apps/web/next.config.ts`, update the existing `Permissions-Policy` header object's `value` from `'camera=(), microphone=(), geolocation=()'` to `'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()'`.
- [x] 3. In `apps/web/next.config.ts`, add two new header objects to the `headers` array of the existing `/(.*)` rule (do not create a second `headers()` entry): `{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }` and `{ key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }`.

## Tests (@tester)

- [x] 4. In `apps/web/e2e/security-headers.spec.ts`, extend the existing `assertSecurityHeaders(headers)` helper to additionally assert `expect(headers['cross-origin-opener-policy']).toBe('same-origin')` and `expect(headers['cross-origin-resource-policy']).toBe('same-origin')`. Keep it as a single shared helper used by all three describe blocks (home, category, 404) — do not create a new file or a new helper.
- [x] 5. In `apps/web/e2e/security-headers.spec.ts`, add `test(...)` cases (Playwright syntax, never `it(...)`) asserting these CSP directives are present in the `content-security-policy` header value: `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, `frame-src 'none'`. **Do NOT assert that `upgrade-insecure-requests` is present** — the suite runs against `nx dev web` (see `apps/web/e2e/run-dev-servers.ts`), where the directive is intentionally gated off, so such an assertion would always fail. Instead assert it is ABSENT, which verifies the gate. Follow the existing pattern used by the "CSP should include frame-ancestors none" test (navigate, read `response?.headers()?.['content-security-policy']`, assert with `toContain`).
- [x] 6. In `apps/web/e2e/security-headers.spec.ts`, update the existing "Permissions-Policy should restrict camera, microphone, geolocation" test (or add assertions to it) to also assert the policy string contains `payment=()`, `usb=()`, and `midi=()`.
- [x] 7. Verify the new/updated `test(...)` cases run against the home page describe block (tagged `@smoke`), consistent with where the existing CSP and Permissions-Policy detail assertions currently live.

## Verification gates

- [x] 8. Run `npm exec nx lint web` and confirm it passes with no new lint errors.
- [x] 9. Run `npm exec nx build web` and confirm the production build succeeds (this also exercises the non-`isDev` CSP branch).
- [x] 10. Run `npm exec nx test web` and confirm existing unit tests still pass (no unit tests are expected to change, since header logic is covered by E2E per the existing pattern).
- [x] 11. Run `npm exec nx e2e web` and confirm `apps/web/e2e/security-headers.spec.ts` passes, including all new/updated assertions for CSP directives, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and the extended `Permissions-Policy`.
- [x] 12. Manually diff the final `next.config.ts` against the "Points design.md must capture" and proposal Non-goals to confirm: `isDev` branching untouched, single `/(.*)` rule retained (no per-path exceptions), and no code added to modify Vercel's `access-control-allow-origin` or `content-disposition` headers.
