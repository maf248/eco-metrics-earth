# Design: Water Footprint — Methodology Discriminator, Citation Integrity, and Digital & Computing

## Technical Approach

### The core problem, stated precisely

A water footprint number is meaningless without its measurement scope. The dataset currently holds four different scopes under one field name:

| Scope               | What it counts                                                   | Source in the dataset       |
| ------------------- | ---------------------------------------------------------------- | --------------------------- |
| Blue water          | Surface + groundwater consumed                                   | Poore & Nemecek 2018        |
| Green + blue + grey | Rainwater + blue + dilution water for pollution                  | Mekonnen & Hoekstra 2011    |
| Life cycle, on-site | Direct water at the facility only (scope 1)                      | _new_                       |
| Life cycle, total   | On-site + water embodied in inputs and electricity (scope 1 + 2) | Williams et al. 2002, _new_ |

Ordering across scopes is arithmetically valid and semantically wrong. The fix makes the scope a first-class field so the UI can show it, and the reader can see why two numbers are not comparable.

### Why a discriminator rather than normalisation

Normalising every entry onto one scope would require re-deriving values we do not have the underlying data for — Poore & Nemecek does not publish green or grey components per product. Re-deriving would replace a disclosure problem with a fabrication problem. Tagging is honest and cheap.

### Why disclosure rather than blocking cross-scope sorting

Blocking the sort when "All" is selected would make the most-used control fail silently, and the comparison is legitimate _within_ a scope. A visible column plus one sentence of context gives the reader what they need without breaking the interaction. This matches how the shipped "Contextual equivalent" column already handles a related honesty problem (it is labelled illustrative and excluded from the cited data).

### Why `Digital & Computing` is in this change and not a follow-up

The AI figures are the cleanest possible demonstration of the discriminator: the same unit of work (one text prompt) is published at 0.26 mL by one source and at ~500 mL per 10–50 responses by another, and the entire gap is scope. Shipping the discriminator with a worked example is what makes the column self-explanatory. The other candidate datasets (water-per-kWh, Aqueduct, lithium) do not exercise the distinction and are deferred.

## Design Decisions

| Decision                                                     | Rationale                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `waterType` required, not optional                           | An optional field would let new entries silently omit the scope, which is exactly the defect being fixed. TypeScript then forces every dataset entry to declare one.                                                                                                                          |
| Four values, not two                                         | `blue` vs `green-blue-grey` is the water-footprint-literature axis; `lifecycle-onsite` vs `lifecycle-total` is the LCA axis. Collapsing them would misfile both.                                                                                                                              |
| Labels in `@eco-metrics/shared`, not in the component        | Mirrors `waterFootprintCategorySlugMap` — the display vocabulary for a shared type lives with the type.                                                                                                                                                                                       |
| `'Digital & Computing'` added to the existing category union | The API already filters by category via the slug map; a new member needs no service change and no new endpoint.                                                                                                                                                                               |
| Remove rather than re-value the four unsupported entries     | We have no primary source for a per-unit figure for PET, a car, a smartphone, or a laptop. Substituting a number from a secondary aggregator would repeat the defect. Removal is the only honest option; the entries can return when a citable value is found.                                |
| `Technology` kept with one entry                             | Renaming or merging the category would change published `?category=` slug semantics. A thin category is a smaller cost than a breaking API contract change.                                                                                                                                   |
| Values transcribed verbatim, never derived                   | "0.26 mL", "500 mL per 10–50 responses", "700,000 L", "5.4 million L", "16,000 L", "11 L/kg", "2.6 L/kg", "5.8 L/kg" each appear as stated in their source. Where a source gives a range (cement 2.0–2.6 L/kg), the dataset stores one endpoint and the `methodology` field states the range. |
| Cement stores 2.6, the range top                             | Understating is the worse error for an environmental dashboard; the `methodology` field carries the full 2.0–2.6 range so nothing is hidden.                                                                                                                                                  |
| Pair each computing figure with its counterpart scope        | A lone 0.26 mL row reads as "AI barely uses water" and a lone 500 mL row reads as the opposite. Both together, with the scope column, is the accurate picture.                                                                                                                                |

### Sub-litre formatting

`formatLiters` uses `Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })`. `0.00026` renders as `"0"`. The AI inference row would ship as "0 L per prompt".

The fix is significant-digit formatting below 1 L rather than a unit switch to millilitres: a unit switch would put two different units in one column and break the "Water footprint" column header's meaning, and the sort is on the raw number regardless. Values ≥ 1 L keep their current rendering exactly, so no existing row changes.

| Input     | Current     | Required                |
| --------- | ----------- | ----------------------- |
| `0.00026` | `0`         | `0.00026`               |
| `0.5`     | `0.5`       | `0.5`                   |
| `1451.2`  | `1,451.2`   | `1,451.2` (unchanged)   |
| `5400000` | `5,400,000` | `5,400,000` (unchanged) |

`formatWaterFootprintEquivalents` already returns `'under 1 shower'` for anything below 65 L, which reads correctly for sub-litre values. No change needed there, but it must be covered by a test.

### Data provenance

Every value in this change was verified against its primary source during research. The construction-material figures come from the blue-water results of Gerbens-Leenes, Hoekstra & Bosman (2018), _Water Resources and Industry_ 19:1–12 (DOI `10.1016/j.wri.2017.11.002`); the per-material numbers are stated in the underlying University of Twente thesis that the paper reports. The current dataset values (steel 250, cement 5, glass 25 L/kg) do not match that source on any scope and are replaced.

The two GPT-3 figures are a single sentence in Li, Yang, Islam & Ren: training GPT-3 in Microsoft's U.S. data centres "can consume a total of 5.4 million liters of water, including 700,000 liters of scope-1 on-site water consumption", and GPT-3 "needs to 'drink' … a 500ml bottle of water for roughly 10 – 50 medium-length responses". Storing both the 700,000 and the 5.4 million figure as separate rows is what makes the scope gap legible.

## Risks

| Risk                                                      | Mitigation                                                                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removing four entries reads as data loss                  | The proposal records each removal with its reason; `docs/data-sources/water-footprint.md` keeps the retired citations and why they were retired, so the decision is auditable and reversible. |
| The 52 → 53 count is asserted in several specs and tests  | The task list enumerates every location; a grep for `52` across `openspec/specs`, `apps/web/e2e` and the test suites is part of the verification step.                                        |
| AI water figures are actively contested in the literature | The dataset states only what each source states, attributes it, and shows the scope. It does not adjudicate between them — the disagreement is the point being surfaced.                      |
| `waterType` becoming required breaks compilation          | Intended. All consumers are in-repo and are updated in the same change.                                                                                                                       |
