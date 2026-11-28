## Why

The "Try again" button of `app/error.tsx` and `app/global-error.tsx` calls `reset`, which re-renders the segment without fetching it again: after a failed server read it renders the same error. Since Next 16.3 the boundaries receive `retry`, which re-fetches and re-renders; the category boundary already uses it.

## What Changes

- Both root boundaries call `retry` from their button.

## Impact

- Web only: `app/error.tsx`, `app/global-error.tsx` and their tests.
- Spec: `web-error-tracking`.
