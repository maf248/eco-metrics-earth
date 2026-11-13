# waste-recycling-api Specification

## Purpose

Serves the World Bank What a Waste 3.0 country dataset, bundled with the API, so the web can
show how much municipal waste each country generates, what happens to it and what it is
made of.

## Requirements

### Requirement: Dataset is generated from the World Bank workbook

A repository script SHALL convert the World Bank "What a Waste 3.0" country workbook into the JSON dataset bundled with the API. Running it again on the same workbook SHALL produce byte-identical output. The dataset SHALL record the World Bank's last-update date of the files and the date the workbook was retrieved.

#### Scenario: Repeatable output

- **GIVEN** the committed dataset and the workbook it was generated from
- **WHEN** the script runs again on that workbook
- **THEN** the output equals the committed dataset

#### Scenario: Dates are recorded

- **WHEN** the dataset is read
- **THEN** it holds the source's last-update date (2026-03-11) and the retrieval date

### Requirement: Waste generation per country and for the world

For every country in the workbook the dataset SHALL hold the municipal waste generated per person per day and in tonnes per year for 2022 (the World Bank's harmonized estimate), the projections for 2030, 2040 and 2050, and the year the measured value was reported (or none). World totals SHALL be the sums over all countries.

#### Scenario: Country generation

- **WHEN** the entry for Germany is read
- **THEN** it reports about 1.63 kg per person per day in 2022, the reported year 2022, and tonnes for 2022, 2030, 2040 and 2050

#### Scenario: World totals

- **WHEN** the world totals are read
- **THEN** 2022 is about 2.33 billion tonnes (0.80 kg per person per day) and 2050 about 3.49 billion tonnes

### Requirement: Treatment shares are grouped and complete

A country with any treatment value SHALL have a share in percent for each of eight groups: recycling; composting (composting and anaerobic digestion); incineration (incineration and refuse-derived fuel); sanitary landfill; other landfill (controlled and unspecified); open dump; uncollected; other (other, mechanical-biological treatment and unaccounted for). The reported shares SHALL sum to 100. A country with no treatment value SHALL have no treatment.

#### Scenario: Grouped shares

- **WHEN** the treatment of Germany is read
- **THEN** recycling is about 47 %, composting about 22 %, incineration about 30 % and the reported shares sum to 100

#### Scenario: Sums are normalized

- **GIVEN** a country whose reported treatment shares add up to more than 100 % (Bolivia, 109 %)
- **WHEN** its treatment is read
- **THEN** its reported shares sum to 100

#### Scenario: Country without treatment

- **WHEN** the treatment of a country without any treatment value (e.g. Nigeria) is read
- **THEN** it has no treatment

### Requirement: Not reported is never zero

A treatment or composition group whose source columns are all blank SHALL be `null` (not reported), never 0, because the source leaves what it did not separate inside "other" or "unaccounted for".

#### Scenario: Blank recycling is not reported

- **GIVEN** India's treatment, with recycling blank and 27 % unaccounted for in the workbook
- **WHEN** it is read
- **THEN** recycling is `null`

#### Scenario: Reported shares still sum to 100

- **WHEN** the treatment of China is read
- **THEN** recycling is `null`, incineration is about 75 % and the reported shares sum to 100

### Requirement: Treatment and composition carry their data year

Each country's treatment and composition SHALL each carry a data year: the latest `date_of_measurement` among its rows in the workbook's codebook. Where the source has no measurement date, the workbook itself sets `date_of_measurement` to the source's publication year, so no fallback is needed; a country with data whose rows carry no year SHALL make the generator fail rather than write a country without one.

#### Scenario: Data year

- **GIVEN** Albania's treatment rows dated 2020 and 2022
- **WHEN** its treatment is read
- **THEN** its year is 2022

### Requirement: Composition shares are grouped

A country with any composition value SHALL have a share in percent for each of six material groups: food and organic (including garden waste); paper and cardboard; plastic; glass; metal; other (textiles, wood, rubber and leather, electronic, hazardous, hygiene and other). As for treatment, a group with no value SHALL be `null` and the reported shares SHALL sum to 100. A country with no composition value SHALL have none.

#### Scenario: Composition of a country

- **WHEN** the composition of India is read
- **THEN** it has the six groups and the reported shares sum to 100

### Requirement: World recycling summary

The dataset SHALL hold, for the key figures, the share of municipal waste recycled weighted by 2022 tonnes over the countries that report recycling, the number of those countries and their share of the world's 2022 population. Countries that do not report recycling SHALL NOT count as zero.

#### Scenario: World recycling summary

- **WHEN** the world summary is read
- **THEN** about 18 % is recycled, over 130 countries holding about 46 % of the world's population

### Requirement: Waste and recycling endpoint

`GET /api/v1/waste-recycling` SHALL answer `200` with the countries, sorted by name, the world totals and the title and suggested citation of the published dataset, plus `meta.source` naming the World Bank as provider with license `CC BY 4.0`, the dataset's catalog URL and its last-update date. The endpoint SHALL NOT call any external service.

#### Scenario: Successful response

- **WHEN** `GET /api/v1/waste-recycling` is requested
- **THEN** the response is `200` with `success: true`, 217 countries and the world totals
- **AND** `meta.source` is the World Bank, `CC BY 4.0`, the catalog URL and `2026-03-11`

### Requirement: Dataset is listed in the data sources catalog

The module SHALL declare the dataset in the data sources catalog as a static dataset for the `waste-recycling` category, with one publication: the World Bank's suggested citation of the country dataset, its URL, its publication year (2026), the number of countries as entry count, and its license `CC BY 4.0`.

#### Scenario: Catalog entry

- **WHEN** `GET /api/v1/data-sources` is requested
- **THEN** `data.datasets` contains the waste-recycling dataset with that publication and its `CC BY 4.0` license
