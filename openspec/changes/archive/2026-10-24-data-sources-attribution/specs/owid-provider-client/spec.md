## ADDED Requirements

### Requirement: OWID attribution defined once

The API SHALL define Our World in Data's attribution in exactly one place, `apps/api/src/common/publishers/publishers.ts` (pure constants, no Nest imports), re-exported by `apps/api/src/modules/providers/owid/owid.attribution.ts`: `OWID_PUBLISHER` = `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`. Every API consumer that needs OWID's name or license (the publisher resolver now; `meta.source` of live OWID responses later) SHALL import it from either path; the strings SHALL NOT be repeated elsewhere in `apps/api/src` or in `apps/web`.

#### Scenario: Publisher constant

- **WHEN** `OWID_PUBLISHER` is read
- **THEN** it equals `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`

#### Scenario: No duplicate definition

- **WHEN** `apps/api/src` and `apps/web/src` are searched for the string `CC BY 4.0`
- **THEN** it appears only in `publishers.ts` (and tests)

#### Scenario: Importing the constant does not require OwidModule

- **WHEN** a module outside `providers/owid/` imports `owid.attribution.ts` or `publishers.ts`
- **THEN** no Nest provider from `OwidModule` is instantiated
