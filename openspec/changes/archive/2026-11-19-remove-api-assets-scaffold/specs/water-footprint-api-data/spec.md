## MODIFIED Requirements

### Requirement: Webpack asset copy to dist/data

The `assets` option in `apps/api/webpack.config.js` SHALL copy every dataset bundled with the API through an explicit object-form entry, and SHALL NOT carry string entries for folders that hold no bundled files (such as the Nx scaffold's `'./src/assets'`):

```js
assets: [
  { input: './src/modules/water-footprint/data', output: 'data', glob: '**/*' },
  { input: './src/modules/waste-recycling/data', output: 'data', glob: '**/*' },
],
```

The object form is REQUIRED: `@nx/webpack`'s `normalizeAssets` computes a string asset's output relative to the project's `sourceRoot`, so a naive string `'./src/modules/water-footprint/data'` would copy to `dist/modules/water-footprint/data/` — a location the bundled service does not read. The object form honors `output` verbatim, copying the file to `dist/data/water-footprint.json` where `join(__dirname, 'data/water-footprint.json')` finds it.

#### Scenario: Build output contains the dataset at the expected path

- **WHEN** `npx nx build api` completes
- **THEN** `apps/api/dist/data/water-footprint.json` exists
- **THEN** `find apps/api/dist -name 'water-footprint.json'` yields exactly one result

#### Scenario: No scaffold asset folder

- **WHEN** `apps/api/webpack.config.js` is inspected
- **THEN** its `assets` option contains only object-form dataset entries
- **AND** `apps/api/src/assets/` does not exist in the repository
