## 1. Replace ignoreCommand in vercel.json

- [ ] 1.1 Replace the current allowlist-based ignoreCommand with the denylist command as specified in design.md Decision 3, preserving the existing guard clauses for unset/unresolvable SHAs

## 2. Verification

- [ ] 2.1 Run `npm run build` to confirm vercel.json JSON is still valid (not executed, just structural integrity)
- [ ] 2.2 Manually verify the shell command: simulate a denylist-only diff (e.g., only apps/api/ changed) and confirm exit code 0; simulate a web change and confirm exit code 1
- [ ] 2.3 Run `npm run test` to ensure no regressions across the workspace
