#!/bin/bash
# Denylist: skip Vercel build ONLY if ALL changed files are in:
#   apps/api/  (deployed on Cloud Run)
#   openspec/  (spec artifacts)
#   *.md       (documentation)
#   Dockerfile / .dockerignore / .github/workflows/deploy-api.yml  (API deploy plumbing)
# Also skip automated release commits (`chore(release): ...`, pushed by
# release.yml with [skip ci]). They never receive CI, so with the Vercel
# Deployment Check enabled their production deployment would wait forever; they
# only touch version fields, changelogs and lockfile metadata, so no build is needed.
# Vercel sets: VERCEL_GIT_PREVIOUS_SHA, VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_MESSAGE

# Release commits → skip (exit 0)
case "$VERCEL_GIT_COMMIT_MESSAGE" in
  'chore(release):'*) exit 0 ;;
esac

# Guard: missing or unresolvable SHA → build
[ -z "$VERCEL_GIT_PREVIOUS_SHA" ] && exit 1
git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA" 2>/dev/null || exit 1

# If any changed file is outside denylist → build (exit 1)
# Otherwise → skip (exit 0)
if git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qv \
  -e '^apps/api/' \
  -e '^openspec/' \
  -e '\.md$' \
  -e '^Dockerfile$' \
  -e '^\.dockerignore$' \
  -e '^\.github/workflows/deploy-api\.yml$'; then
  exit 1
else
  exit 0
fi
