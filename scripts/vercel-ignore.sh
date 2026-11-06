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

# List the changed files first: inside a pipe a failed diff would print nothing
# and read as "only denylisted files", skipping the build. Failed diff → build.
# core.quotePath=false: non-ASCII paths are not quoted, so they can match.
# --no-renames: a rename lists both paths, so moving a web file into a
# denylisted path still builds.
changed=$(git -c core.quotePath=false diff --no-renames --name-only \
  "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA") || exit 1

# Nothing changed → skip (exit 0)
[ -z "$changed" ] && exit 0

# If any changed file is outside denylist → build (exit 1)
# Otherwise → skip (exit 0)
if printf '%s\n' "$changed" | grep -qv \
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
