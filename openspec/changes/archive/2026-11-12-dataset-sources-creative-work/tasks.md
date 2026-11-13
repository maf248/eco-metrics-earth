## 1. Builder

- [x] 1.1 Add `buildSourceWork` to `apps/web/src/lib/datasetJsonLd.ts`: a schema.org `CreativeWork` with `name`, `publisher` (an `Organization` with `name` and optional `url`), `url`, and optional `version` and `citation`; type `isBasedOn` of `DatasetJsonLdFields` as one or more of its results.
- [x] 1.2 Build every `isBasedOn` entry of the CO2, energy, temperature and waste builders with it (drop the local `upstream` helper of the temperature builder).

## 2. Tests

- [x] 2.1 Unit tests: `buildSourceWork` output with and without the optional fields; every category builder emits only `CreativeWork` entries in `isBasedOn`, with the same names, publishers, URLs, versions and citation as before.
- [x] 2.2 E2E: the energy, temperature, CO2 and waste specs assert that no `isBasedOn` entry is typed `Dataset`.
- [x] 2.3 Gates: lint, build and unit tests of `web`; the four category E2E specs.
