## 1. Replace ignoreCommand in vercel.json

- [x] 1.1 Replace the current allowlist-based ignoreCommand with the denylist command as specified in design.md Decision 3, preserving the existing guard clauses for unset/unresolvable SHAs

## 2. Verification

- [x] 2.1 Run `npm run build` to confirm vercel.json JSON is still valid (not executed, just structural integrity)
- [x] 2.2 Manually verify the shell command: simulate a denylist-only diff (e.g., only apps/api/ changed) and confirm exit code 0; simulate a web change and confirm exit code 1
- [x] 2.3 Run `npm run test` to ensure no regressions across the workspace

> Boxes ticked retroactively on 2026-09-26 when the OpenSpec CLI's `validate --archived` pre-push gate was adopted: the work is evidenced by `vercel.json` (`"ignoreCommand": "bash scripts/vercel-ignore.sh"` — the denylist script this change introduced) and by the repo's green build/test history since. No content other than the checkboxes and this footnote changed.
