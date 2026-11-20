## 1. Config

- [x] 1.1 Remove the `'./src/assets'` entry from the `assets` option of `apps/api/webpack.config.js`.
- [x] 1.2 Delete `apps/api/src/assets/.gitkeep`.

## 2. Verification

- [x] 2.1 `npx nx build api` passes and `apps/api/dist/data/` contains exactly `water-footprint.json` and `waste-recycling.json`.
- [x] 2.2 Gates: lint and unit tests of `api`.
