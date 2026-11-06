#!/usr/bin/env bash
# Decides whether CI must build the API image (build=true|false) from the paths
# changed between BASE_SHA and HEAD_SHA. Any doubt builds.
# CI_ONLY_PATTERN covers files that change how the image is checked, not the
# image itself, so they stay out of the pattern file that deploy-api.yml reads.
set -u

PATTERN_FILE="$(dirname "${BASH_SOURCE[0]}")/api-image-inputs.pattern"
CI_ONLY_PATTERN='^\.github/workflows/ci\.yml$|^scripts/api-image-inputs\.pattern$|^scripts/detect-api-image-changes\.sh$'
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"
matched=""

decide() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "build=$1" >> "$GITHUB_OUTPUT"
  fi
  echo "Base SHA: ${BASE_SHA:-none}"
  echo "Head SHA: $HEAD_SHA"
  echo "Matched files: ${matched:-none}"
  echo "Decision: build=$1 ($2)"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "### API image change detection"
      echo "- Base SHA: \`${BASE_SHA:-none}\`"
      echo "- Head SHA: \`$HEAD_SHA\`"
      echo "- Matched files: $(printf '%s' "${matched:-none}" | tr '\n' ' ')"
      echo "- Decision: **build=$1** ($2)"
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 0
}

if [ ! -r "$PATTERN_FILE" ]; then
  decide true "pattern file $PATTERN_FILE is missing"
fi
PATTERN="$(cat "$PATTERN_FILE")|$CI_ONLY_PATTERN"

if [ -z "$BASE_SHA" ] || [[ "$BASE_SHA" =~ ^0+$ ]]; then
  decide true "no base revision to compare against"
fi

if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  decide true "base SHA is not in the repository history"
fi

# core.quotePath=false: otherwise non-ASCII paths are quoted and never match.
# --no-renames: a rename lists both its old and new path, so moving a file out
# of an image input still counts as an image input change.
if ! changed=$(git -c core.quotePath=false diff --no-renames --name-only "$BASE_SHA" "$HEAD_SHA"); then
  decide true "git diff failed"
fi

# grep exits 1 when nothing matches; anything above 1 is an error (e.g. a bad pattern).
grep_status=0
matched=$(printf '%s\n' "$changed" | grep -E "$PATTERN") || grep_status=$?
if [ "$grep_status" -gt 1 ]; then
  decide true "could not match the changed paths against the pattern"
fi
if [ -n "$matched" ]; then
  decide true "API image inputs changed"
fi
decide false "no API image inputs changed"
