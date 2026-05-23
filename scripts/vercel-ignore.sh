#!/bin/bash
# Denylist: skip Vercel build ONLY if ALL changed files are in:
#   apps/api/  (deployed on Railway)
#   openspec/  (spec artifacts)
#   *.md       (documentation)
# Vercel sets: VERCEL_GIT_PREVIOUS_SHA, VERCEL_GIT_COMMIT_SHA

# Guard: missing or unresolvable SHA → build
[ -z "$VERCEL_GIT_PREVIOUS_SHA" ] && exit 1
git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA" 2>/dev/null || exit 1

# If any changed file is outside denylist → build (exit 1)
# Otherwise → skip (exit 0)
if git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qv -e '^apps/api/' -e '^openspec/' -e '\.md$'; then
  exit 1
else
  exit 0
fi
