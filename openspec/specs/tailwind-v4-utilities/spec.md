# tailwind-v4-utilities Specification

## Purpose
TBD - created by archiving change tailwind-v4. Update Purpose after archive.
## Requirements
### Requirement: All existing utility classes render correctly under v4
Every Tailwind utility class currently used in `apps/web/src/**` SHALL produce the same visual output under v4 as it did under v3. No class SHALL silently produce no output or incorrect output after the upgrade.

#### Scenario: Opacity modifier classes are retained
- **WHEN** the built CSS is inspected after migration
- **THEN** classes such as `bg-white/5`, `bg-white/8`, `bg-white/10`, `bg-white/15`, and `hover:bg-white/5` SHALL generate valid CSS rules

#### Scenario: Focus-visible ring classes are retained
- **WHEN** the built CSS is inspected after migration
- **THEN** `focus-visible:ring-2`, `focus-visible:ring-emerald-400`, `focus-visible:ring-offset-2`, and `focus-visible:ring-offset-black` SHALL generate valid CSS rules with explicit sizes

#### Scenario: Responsive and interactive variants are retained
- **WHEN** the built CSS is inspected after migration
- **THEN** all `lg:` prefixed classes and `hover:` prefixed classes used in the codebase SHALL generate valid CSS rules

---

### Requirement: No deprecated v3 utility patterns are present
The codebase SHALL NOT use any utility class syntax that was valid in v3 but removed or renamed in v4, including `bg-opacity-*`, `text-opacity-*`, `border-opacity-*`, and `ring-opacity-*`.

#### Scenario: Audit finds no deprecated opacity utilities
- **WHEN** `apps/web/src/**` is searched for `bg-opacity-`, `text-opacity-`, `border-opacity-`, `ring-opacity-`
- **THEN** zero matches SHALL be found

---

### Requirement: All tests pass after migration with zero warnings
Running `npx nx test web` SHALL produce 0 failing tests and 0 console warnings or errors after the Tailwind v4 migration.

#### Scenario: Test suite passes clean
- **WHEN** `npx nx test web` is executed after migration
- **THEN** all test suites SHALL pass and the output SHALL contain zero `console.warn` or `console.error` calls
