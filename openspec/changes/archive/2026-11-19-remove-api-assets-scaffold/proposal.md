# Proposal

## Why

`apps/api/src/assets/` is an empty folder kept alive by a `.gitkeep` since the Nx scaffold of
the monorepo. Nothing has ever been placed in it, and nothing in the repository reads it. The
only reason it survives is the `'./src/assets'` string entry of the `assets` option in
`apps/api/webpack.config.js`, and the canonical spec `water-footprint-api-data` quotes that
option verbatim, so the scaffold entry reads as a requirement.

The quoted block is also stale: it no longer matches the config, which gained the
waste-recycling dataset entry after the spec was written. What the requirement actually
protects is the object form of the dataset entry, which puts the file at `dist/data/` where
the bundled service reads it.

## What Changes

- Remove the `'./src/assets'` entry from the `assets` option of `apps/api/webpack.config.js`.
- Delete `apps/api/src/assets/.gitkeep` (and with it the empty folder).
- Restate the "Webpack asset copy to dist/data" requirement: every dataset bundled with the
  API is copied by an object-form entry, the option carries no scaffold string entry, and the
  quoted block matches the current config.

## Non-Goals

- No change to the dataset locations, the service code or the build output: `dist/data/`
  keeps `water-footprint.json` and `waste-recycling.json`.
- No change to the waste-recycling spec, which does not describe the asset copy.

## Impact

- `apps/api/webpack.config.js`, `apps/api/src/assets/.gitkeep`.
- Specs: `water-footprint-api-data` (modified "Webpack asset copy to dist/data").
- The `api-image` CI job builds the image, since `apps/api/` is an image input.
