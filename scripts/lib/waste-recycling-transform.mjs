/**
 * Pure transform of the World Bank "What a Waste 3.0" workbook into the bundled dataset: XML cell
 * reading, grouping, normalization and assembly. No file or network access, so Jest can import it;
 * `scripts/generate-waste-recycling-data.mjs` wraps it with the workbook and the output file.
 */

/** Last update of the World Bank files (catalog page), constant next to the workbook URL. */
const SOURCE_LAST_UPDATED = '2026-03-11';
const KOSOVO_WORKBOOK_CODE = 'XKX';
const KOSOVO_ENTITY_CODE = 'OWID_KOS';
const KOSOVO_ISO2 = 'XK';
/** Codes without a flag: the Channel Islands have no ISO 3166-1 code of their own. */
const NO_FLAG_CODES = new Set(['CHI']);
const MIN_CROSSWALK_SIZE = 200;

export const TREATMENT_GROUPS = {
  recycling: ['waste_treatment_recycling_percent'],
  composting: ['waste_treatment_compost_percent', 'waste_treatment_anaerobic_digestion_percent'],
  incineration: ['waste_treatment_incineration_percent', 'waste_treatment_rdf_percent'],
  sanitaryLandfill: ['waste_treatment_sanitary_landfill_landfill_gas_system_percent'],
  otherLandfill: [
    'waste_treatment_controlled_landfill_percent',
    'waste_treatment_landfill_unspecified_percent',
  ],
  openDump: ['waste_treatment_open_dumpsite_percent'],
  uncollected: ['waste_uncollected_percent'],
  other: [
    'waste_treatment_other_percent',
    'waste_treatment_mbt_percent',
    'waste_treatment_unaccounted_for_percent',
  ],
};

export const COMPOSITION_GROUPS = {
  foodOrganic: [
    'composition_msw_food_organic_waste_percent',
    'composition_msw_yard_garden_green_waste_percent',
  ],
  paperCardboard: ['composition_msw_paper_cardboard_percent'],
  plastic: ['composition_msw_plastic_percent'],
  glass: ['composition_msw_glass_percent'],
  metal: ['composition_msw_metal_percent'],
  other: [
    'composition_msw_textile_waste_percent',
    'composition_msw_wood_percent',
    'composition_msw_rubber_leather_percent',
    'composition_msw_weee_percent',
    'composition_msw_hazardous_percent',
    'composition_msw_diapers_and_hygiene_percent',
    'composition_msw_other_percent',
  ],
};

const PROJECTION_YEARS = [2022, 2030, 2040, 2050];
const KG_KEY = 'msw_total_msw_generated_kg_per_cap_per_day_projected_2022';
const tonnesKey = (year) => `msw_total_msw_generated_tonnes_year_projected_${year}`;
const populationKey = (year) => `population_number_of_people_${year}`;
const GENERATION_YEAR_KEY = 'msw_total_msw_generation_year';

export const COUNTRY_KEYS = [
  'iso3c',
  'country_name',
  GENERATION_YEAR_KEY,
  KG_KEY,
  ...PROJECTION_YEARS.map(tonnesKey),
  ...PROJECTION_YEARS.map(populationKey),
  ...Object.values(TREATMENT_GROUPS).flat(),
  ...Object.values(COMPOSITION_GROUPS).flat(),
];
const CODEBOOK_KEYS = ['iso3c', 'measurement', 'date_of_measurement'];

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function entityText(decimal, hex, name) {
  if (name) {
    return XML_ENTITIES[name];
  }
  return String.fromCodePoint(decimal ? Number(decimal) : Number.parseInt(hex, 16));
}

export function decodeXml(text) {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-fA-F]+)|(amp|lt|gt|quot|apos));/g,
    (_, decimal, hex, name) => entityText(decimal, hex, name),
  );
}

function columnIndex(reference) {
  let index = 0;
  for (const char of reference.match(/^[A-Z]+/)[0]) {
    index = index * 26 + (char.codePointAt(0) - 64);
  }
  return index - 1;
}

/** The text of every `<t>` inside a fragment (shared strings and inline strings). */
function textOf(fragment) {
  return [...fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map(([, text]) => decodeXml(text))
    .join('');
}

function attribute(tag, name) {
  const match = new RegExp(String.raw`\s${name}="([^"]*)"`).exec(tag);
  return match ? decodeXml(match[1]) : undefined;
}

export function readSharedStrings(xml) {
  if (!xml) {
    return [];
  }
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(([, si]) => textOf(si));
}

/** The value of a cell from its type and inner XML; `null` when blank. */
function cellValue(type, body, shared) {
  if (type === 'inlineStr') {
    return textOf(body) || null;
  }
  const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
  const decoded = raw === undefined ? '' : decodeXml(raw);
  // An empty `<v></v>` is a blank cell, never a 0.
  if (decoded.trim() === '') {
    return null;
  }
  switch (type) {
    case 's':
      return shared[Number(decoded)] || null;
    case 'str':
    case 'e':
      return decoded;
    case 'b':
      return decoded === '1';
    default:
      return Number(decoded);
  }
}

/** Rows of a sheet as arrays of cell values (strings, numbers or `null` when blank). */
export function readSheet(xml, shared) {
  const rows = [];
  for (const [, rowXml] of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const [, tag, body = ''] of rowXml.matchAll(/<c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      cells[columnIndex(attribute(tag, 'r'))] = cellValue(attribute(tag, 't'), body, shared);
    }
    rows.push(cells);
  }
  return rows;
}

/** Maps sheet names to their XML path through `workbook.xml` and its relationships. */
export function sheetPaths(workbookXml, relsXml) {
  const relationships = new Map(
    [...relsXml.matchAll(/<Relationship\s[^>]*>/g)].map(([tag]) => [
      attribute(tag, 'Id'),
      attribute(tag, 'Target'),
    ]),
  );
  const paths = new Map();
  for (const [tag] of workbookXml.matchAll(/<sheet\s[^>]*>/g)) {
    const target = relationships.get(attribute(tag, 'r:id')).replace(/^\//, '');
    paths.set(attribute(tag, 'name'), target.startsWith('xl/') ? target : `xl/${target}`);
  }
  return paths;
}

export function indexByHeader(headerRow, required, sheet) {
  const index = new Map();
  headerRow.forEach((name, position) => {
    if (typeof name === 'string' && !index.has(name.trim())) {
      index.set(name.trim(), position);
    }
  });
  const missing = required.filter((key) => !index.has(key));
  if (missing.length > 0) {
    throw new Error(`Sheet "${sheet}" is missing the columns: ${missing.join(', ')}`);
  }
  return index;
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
};

/**
 * Sums the reported columns of a group (fractions to percent). `null` when every column is blank.
 */
export function groupValue(row, columns, index) {
  let sum = null;
  for (const column of columns) {
    const value = number(row[index.get(column)]);
    if (value !== null) {
      sum = (sum ?? 0) + value * 100;
    }
  }
  return sum;
}

/** Rounds shares to 0.1 so that they sum to exactly 100.0 (largest remainder, ties by order). */
export function roundToHundred(shares) {
  const entries = Object.entries(shares).filter(([, value]) => value !== null);
  const tenths = entries.map(([name, value]) => ({
    name,
    floor: Math.floor(value * 10 + 1e-9),
    remainder: value * 10 - Math.floor(value * 10 + 1e-9),
  }));
  let missing = 1000 - tenths.reduce((sum, { floor }) => sum + floor, 0);
  const byRemainder = [...tenths].sort((a, b) => b.remainder - a.remainder);
  for (const entry of byRemainder) {
    if (missing <= 0) {
      break;
    }
    entry.floor += 1;
    missing -= 1;
  }
  const rounded = new Map(tenths.map(({ name, floor }) => [name, floor / 10]));
  return Object.fromEntries(Object.keys(shares).map((name) => [name, rounded.get(name) ?? null]));
}

/** Reported groups scaled to sum to 100 (not rounded), `null` where not reported. */
export function normalizedShares(row, groups, index, label) {
  const raw = Object.fromEntries(
    Object.entries(groups).map(([name, columns]) => [name, groupValue(row, columns, index)]),
  );
  const total = Object.values(raw).reduce((sum, value) => sum + (value ?? 0), 0);
  if (Object.values(raw).every((value) => value === null)) {
    return null;
  }
  if (total <= 0) {
    throw new Error(`${label}: reported shares sum to ${total}, cannot be normalized`);
  }
  return Object.fromEntries(
    Object.entries(raw).map(([name, value]) => [
      name,
      value === null ? null : (value * 100) / total,
    ]),
  );
}

function measurementKind(measurement) {
  if (measurement.startsWith('waste_treatment_') || measurement === 'waste_uncollected_percent') {
    return 'treatment';
  }
  return measurement.startsWith('composition_msw_') ? 'composition' : null;
}

/** The latest year of the codebook rows of a country whose measurement matches `prefixes`. */
export function dataYears(codebookRows, index) {
  const years = new Map();
  for (const row of codebookRows) {
    const code = row[index.get('iso3c')];
    const measurement = row[index.get('measurement')];
    const date = row[index.get('date_of_measurement')];
    if (typeof code !== 'string' || typeof measurement !== 'string' || date === null) {
      continue;
    }
    const kind = measurementKind(measurement);
    const found = String(date).match(/\b(19|20)\d{2}\b/g);
    if (kind === null || found === null) {
      continue;
    }
    const key = `${kind}:${code}`;
    years.set(key, Math.max(years.get(key) ?? 0, ...found.map(Number)));
  }
  return years;
}

function buildCountry(row, index, years) {
  const rawCode = row[index.get('iso3c')];
  const code = rawCode === KOSOVO_WORKBOOK_CODE ? KOSOVO_ENTITY_CODE : rawCode;
  const kg = number(row[index.get(KG_KEY)]);
  const tonnes = PROJECTION_YEARS.map((year) => number(row[index.get(tonnesKey(year))]));
  if (kg === null || tonnes.includes(null)) {
    throw new Error(`${rawCode}: waste generation is missing`);
  }
  const reportedYear = number(row[index.get(GENERATION_YEAR_KEY)]);
  const population = number(row[index.get(populationKey(2022))]);

  const country = {
    code,
    iso2: null,
    name: String(row[index.get('country_name')]).trim(),
    population: population === null ? null : Math.round(population),
    generation: {
      kgPerPersonPerDay2022: roundTo(kg, 2),
      tonnes2022: Math.round(tonnes[0]),
      tonnes2030: Math.round(tonnes[1]),
      tonnes2040: Math.round(tonnes[2]),
      tonnes2050: Math.round(tonnes[3]),
      reportedYear: reportedYear === null ? null : Math.round(reportedYear),
    },
  };

  const exact = { treatment: null, recycling: null };
  const treatmentShares = normalizedShares(row, TREATMENT_GROUPS, index, `${rawCode} treatment`);
  if (treatmentShares) {
    const year = years.get(`treatment:${rawCode}`);
    if (!year) {
      throw new Error(`${rawCode}: treatment data without a year in the codebook`);
    }
    country.treatment = { year, shares: roundToHundred(treatmentShares) };
    exact.treatment = treatmentShares;
  }
  const compositionShares = normalizedShares(
    row,
    COMPOSITION_GROUPS,
    index,
    `${rawCode} composition`,
  );
  if (compositionShares) {
    const year = years.get(`composition:${rawCode}`);
    if (!year) {
      throw new Error(`${rawCode}: composition data without a year in the codebook`);
    }
    country.composition = { year, shares: roundToHundred(compositionShares) };
  }
  return { country, recycling: exact.treatment?.recycling ?? null };
}

export function buildDataset(countryRows, codebookRows, retrieved) {
  const index = indexByHeader(countryRows[1], COUNTRY_KEYS, 'Country dataset');
  assertHeadersMapped(index);
  const codebookIndex = indexByHeader(codebookRows[0], CODEBOOK_KEYS, 'Codebook');
  const years = dataYears(codebookRows.slice(1), codebookIndex);

  const built = countryRows
    .slice(2)
    .filter((row) => typeof row[index.get('iso3c')] === 'string')
    .map((row) => buildCountry(row, index, years));

  const sums = Object.fromEntries(
    PROJECTION_YEARS.map((year) => [
      year,
      built.reduce((sum, { country }) => sum + country.generation[`tonnes${year}`], 0),
    ]),
  );
  const population = built.reduce((sum, { country }) => sum + (country.population ?? 0), 0);
  const reporting = built.filter(({ recycling }) => recycling !== null);
  const reportingTonnes = reporting.reduce(
    (sum, { country }) => sum + country.generation.tonnes2022,
    0,
  );
  const recycledTonnes = reporting.reduce(
    (sum, { country, recycling }) => sum + (recycling / 100) * country.generation.tonnes2022,
    0,
  );
  const reportingPopulation = reporting.reduce(
    (sum, { country }) => sum + (country.population ?? 0),
    0,
  );

  const countries = built
    .map(({ country }) => country)
    .sort((a, b) => a.name.localeCompare(b.name, 'en') || a.code.localeCompare(b.code));

  return {
    lastUpdated: SOURCE_LAST_UPDATED,
    retrieved,
    world: {
      generation: {
        kgPerPersonPerDay2022: roundTo(((sums[2022] / population) * 1000) / 365, 2),
        tonnes2022: sums[2022],
        tonnes2030: sums[2030],
        tonnes2040: sums[2040],
        tonnes2050: sums[2050],
      },
      recycling: {
        sharePercent: roundTo((recycledTonnes / reportingTonnes) * 100, 2),
        countries: reporting.length,
        // Two decimals: the page rounds the exact value once, so 46.47 reads "about 46%".
        populationSharePercent: roundTo((reportingPopulation / population) * 100, 2),
      },
    },
    countries,
  };
}

/**
 * Fails when the workbook has a treatment or composition column this script does not map: a new
 * column would otherwise be dropped silently and the shares would no longer describe the whole.
 */
function assertHeadersMapped(index) {
  const mapped = new Set([
    ...Object.values(TREATMENT_GROUPS).flat(),
    ...Object.values(COMPOSITION_GROUPS).flat(),
  ]);
  const unmapped = [...index.keys()].filter(
    (key) =>
      (key.startsWith('waste_treatment_') ||
        key.startsWith('composition_msw_') ||
        key === 'waste_uncollected_percent') &&
      !mapped.has(key),
  );
  if (unmapped.length > 0) {
    throw new Error(`Unmapped treatment or composition columns: ${unmapped.join(', ')}`);
  }
}

/** ISO 3166-1 alpha-3 to alpha-2 pairs of the shared crosswalk source. */
export function parseCrosswalk(source) {
  const crosswalk = new Map(
    [...source.matchAll(/^[ \t]+([A-Z]{3}): '([A-Z]{2})',$/gm)].map(([, iso3, iso2]) => [
      iso3,
      iso2,
    ]),
  );
  if (crosswalk.size < MIN_CROSSWALK_SIZE) {
    throw new Error(
      `The ISO crosswalk parsed to ${crosswalk.size} codes (expected at least ${MIN_CROSSWALK_SIZE}): its layout changed`,
    );
  }
  return crosswalk;
}

/** Fills `iso2` from the crosswalk; every code except the Channel Islands must have one. */
export function withIso2(dataset, crosswalk) {
  const missing = [];
  for (const country of dataset.countries) {
    country.iso2 =
      country.code === KOSOVO_ENTITY_CODE ? KOSOVO_ISO2 : (crosswalk.get(country.code) ?? null);
    if (country.iso2 === null && !NO_FLAG_CODES.has(country.code)) {
      missing.push(country.code);
    }
  }
  if (missing.length > 0) {
    throw new Error(`No ISO alpha-2 code for: ${missing.join(', ')}`);
  }
  return dataset;
}
