import {
  buildDataset,
  COMPOSITION_GROUPS,
  COUNTRY_KEYS,
  dataYears,
  decodeXml,
  groupValue,
  indexByHeader,
  normalizedShares,
  parseCrosswalk,
  readSharedStrings,
  readSheet,
  roundToHundred,
  sheetPaths,
  TREATMENT_GROUPS,
  withIso2,
  type Cell,
  type WasteDataset,
} from '../../../../scripts/lib/waste-recycling-transform.mjs';

const sheetXml = (rows: string[]): string =>
  `<worksheet><sheetData>${rows.map((cells, i) => `<row r="${i + 1}">${cells}</row>`).join('')}</sheetData></worksheet>`;

describe('decodeXml', () => {
  it('should decode the five entities and numeric references', () => {
    expect(decodeXml('a &lt;b&gt; &quot;c&quot; &apos;d&apos; &#65;&#x42;')).toBe(
      'a <b> "c" \'d\' AB',
    );
  });

  it('should decode once: an escaped ampersand is not decoded again', () => {
    expect(decodeXml('&amp;amp;')).toBe('&amp;');
  });
});

describe('readSheet', () => {
  const shared = readSharedStrings(
    '<sst><si><t>iso3c</t></si><si><r><t>Tom &amp;</t><t> Jerry</t></r></si></sst>',
  );

  it('should read shared strings, rich text and inline strings', () => {
    expect(shared).toEqual(['iso3c', 'Tom & Jerry']);
    const [row] = readSheet(
      sheetXml([
        '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>x &lt; y</t></is></c>',
      ]),
      shared,
    );
    expect(row).toEqual(['iso3c', 'Tom & Jerry', 'x < y']);
  });

  it('should parse numbers in exponent notation', () => {
    const [row] = readSheet(
      sheetXml(['<c r="A1"><v>3.89E-2</v></c><c r="B1"><v>1.5e3</v></c>']),
      [],
    );
    expect(row).toEqual([0.0389, 1500]);
  });

  it('should read an empty <v></v> and a self-closing cell as blank, never 0', () => {
    const [row] = readSheet(
      sheetXml(['<c r="A1"><v></v></c><c r="B1"/><c r="C1"><v>0</v></c>']),
      [],
    );
    expect(row[0]).toBeNull();
    expect(row[1]).toBeNull();
    expect(row[2]).toBe(0);
  });

  it('should place cells by their column reference, leaving gaps', () => {
    const [row] = readSheet(sheetXml(['<c r="C1"><v>7</v></c>']), []);
    expect(row[2]).toBe(7);
    expect(row[0]).toBeUndefined();
  });

  it('should read booleans and formula strings', () => {
    const [row] = readSheet(
      sheetXml(['<c r="A1" t="b"><v>1</v></c><c r="B1" t="str"><v>ok</v></c>']),
      [],
    );
    expect(row).toEqual([true, 'ok']);
  });

  it('should have no shared strings without the part', () => {
    expect(readSharedStrings(undefined)).toEqual([]);
  });
});

describe('sheetPaths', () => {
  it('should map sheet names to their parts through the relationships', () => {
    const paths = sheetPaths(
      '<workbook><sheets><sheet name="Country dataset" sheetId="1" r:id="rId2"/><sheet name="Codebook" sheetId="2" r:id="rId3"/></sheets></workbook>',
      '<Relationships><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="/xl/worksheets/sheet3.xml"/></Relationships>',
    );
    expect(paths.get('Country dataset')).toBe('xl/worksheets/sheet2.xml');
    expect(paths.get('Codebook')).toBe('xl/worksheets/sheet3.xml');
  });
});

describe('indexByHeader', () => {
  it('should map machine keys to positions, whatever their column', () => {
    const index = indexByHeader(['x', ' iso3c ', 'name'], ['name', 'iso3c'], 'Sheet');
    expect(index.get('iso3c')).toBe(1);
    expect(index.get('name')).toBe(2);
  });

  it('should throw naming the missing keys', () => {
    expect(() =>
      indexByHeader(['iso3c'], ['iso3c', 'country_name', 'gdp'], 'Country dataset'),
    ).toThrow('Sheet "Country dataset" is missing the columns: country_name, gdp');
  });
});

describe('roundToHundred', () => {
  const tenths = (shares: Record<string, number | null>): number =>
    Math.round(Object.values(shares).reduce<number>((sum, value) => sum + (value ?? 0), 0) * 10);

  it('should sum to exactly 100.0 for awkward thirds', () => {
    const rounded = roundToHundred({ a: 100 / 3, b: 100 / 3, c: 100 / 3 });
    expect(tenths(rounded)).toBe(1000);
    expect(Object.values(rounded).sort()).toEqual([33.3, 33.3, 33.4]);
  });

  it('should keep null groups null and sum the reported ones to 1000 tenths', () => {
    const rounded = roundToHundred({ a: 12.345, b: null, c: 87.655 });
    expect(rounded.b).toBeNull();
    expect(tenths(rounded)).toBe(1000);
  });

  it.each([
    [{ a: 33.34, b: 33.33, c: 33.33 }],
    [{ a: 0.04, b: 0.04, c: 99.92 }],
    [{ a: 50, b: 25, c: 25 }],
    [{ a: 14.28, b: 14.28, c: 14.29, d: 14.29, e: 14.28, f: 14.29, g: 14.29 }],
  ])('should always reach 1000 tenths (%j)', (shares) => {
    expect(tenths(roundToHundred(shares))).toBe(1000);
  });
});

describe('groupValue and normalizedShares', () => {
  const index = new Map([
    ['compost', 0],
    ['digestion', 1],
    ['recycling', 2],
  ]);

  it('should be null when every column of the group is blank, never 0', () => {
    expect(groupValue([null, undefined, 0.2], ['compost', 'digestion'], index)).toBeNull();
  });

  it('should sum the reported columns as percent, and keep a reported 0', () => {
    expect(groupValue([0.1, null, 0], ['compost', 'digestion'], index)).toBeCloseTo(10);
    expect(groupValue([0, null, 0], ['compost', 'digestion'], index)).toBe(0);
  });

  it('should scale the reported groups to 100 (a 109 % source) and leave blanks null', () => {
    const shares = normalizedShares(
      [0.545, null, 0.545],
      { composting: ['compost'], other: ['digestion'], recycling: ['recycling'] },
      index,
      'XXX',
    );
    expect(shares?.other).toBeNull();
    expect((shares?.composting ?? 0) + (shares?.recycling ?? 0)).toBeCloseTo(100);
  });

  it('should be null when nothing is reported and throw when the reported shares sum to 0', () => {
    expect(normalizedShares([null, null, null], { a: ['compost'] }, index, 'XXX')).toBeNull();
    expect(() => normalizedShares([0, null, null], { a: ['compost'] }, index, 'XXX')).toThrow(
      'cannot be normalized',
    );
  });
});

describe('dataYears', () => {
  const index = new Map([
    ['iso3c', 0],
    ['measurement', 1],
    ['date_of_measurement', 2],
  ]);

  it('should take the latest year per country and kind', () => {
    const years = dataYears(
      [
        ['ALB', 'waste_treatment_recycling_percent', 2020],
        ['ALB', 'waste_uncollected_percent', '2022'],
        ['ALB', 'composition_msw_plastic_percent', 2018],
        ['ALB', 'uncollected_waste_other_percent', 2030],
        ['ALB', 'waste_treatment_other_percent', null],
      ],
      index,
    );
    expect(years.get('treatment:ALB')).toBe(2022);
    expect(years.get('composition:ALB')).toBe(2018);
  });

  it('should find a year inside text and skip rows without one', () => {
    const years = dataYears(
      [
        ['DEU', 'composition_msw_glass_percent', 'FY 2019/2021'],
        ['DEU', 'composition_msw_metal_percent', 'n/a'],
      ],
      index,
    );
    expect(years.get('composition:DEU')).toBe(2021);
  });
});

describe('parseCrosswalk and withIso2', () => {
  const entries = Array.from(
    { length: 210 },
    (_, i) =>
      `  A${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}: 'Z${String.fromCharCode(65 + (i % 26))}',`,
  ).join('\n');

  it('should parse the alpha-3 to alpha-2 pairs', () => {
    expect(parseCrosswalk(`${entries}\n  DEU: 'DE',`).get('DEU')).toBe('DE');
  });

  it('should throw when the crosswalk layout changed and parsed too few codes', () => {
    expect(() => parseCrosswalk("export const X = { DEU: 'DE' };")).toThrow('layout changed');
  });

  const dataset = (codes: string[]): WasteDataset =>
    ({
      lastUpdated: '',
      retrieved: '',
      world: {} as WasteDataset['world'],
      countries: codes.map((code) => ({
        code,
        iso2: null,
        name: code,
        population: null,
        generation: {},
      })),
    }) as WasteDataset;

  it('should give Kosovo XK and leave the Channel Islands without a flag', () => {
    const filled = withIso2(dataset(['DEU', 'OWID_KOS', 'CHI']), new Map([['DEU', 'DE']]));
    expect(filled.countries.map(({ iso2 }) => iso2)).toEqual(['DE', 'XK', null]);
  });

  it('should throw naming any other code without an alpha-2 code', () => {
    expect(() => withIso2(dataset(['DEU', 'ZZZ']), new Map([['DEU', 'DE']]))).toThrow(
      'No ISO alpha-2 code for: ZZZ',
    );
  });
});

describe('buildDataset', () => {
  const keys = [...COUNTRY_KEYS, 'region_id'];
  const labels = keys.map((key) => `label ${key}`);
  const row = (values: Record<string, Cell>): Cell[] => keys.map((key) => values[key] ?? null);
  const base = {
    iso3c: 'AAA',
    country_name: 'Aland',
    msw_total_msw_generated_kg_per_cap_per_day_projected_2022: 1.234,
    msw_total_msw_generated_tonnes_year_projected_2022: 1000,
    msw_total_msw_generated_tonnes_year_projected_2030: 1100,
    msw_total_msw_generated_tonnes_year_projected_2040: 1200,
    msw_total_msw_generated_tonnes_year_projected_2050: 1300,
    population_number_of_people_2022: 500,
  };
  const codebook: Cell[][] = [
    ['iso3c', 'measurement', 'date_of_measurement'],
    ['AAA', 'waste_treatment_recycling_percent', 2021],
    ['AAA', 'composition_msw_plastic_percent', 2019],
  ];
  const build = (extra: Record<string, Cell>, header: Cell[] = keys): WasteDataset =>
    buildDataset([labels, header, row({ ...base, ...extra })], codebook, '2026-11-11');

  it('should leave treatment and composition out for a country that reports none', () => {
    const [country] = build({}).countries;
    expect(country.treatment).toBeUndefined();
    expect(country.composition).toBeUndefined();
    expect(country.generation.kgPerPersonPerDay2022).toBe(1.23);
  });

  it('should make a blank recycling group null and normalize the rest to 100', () => {
    const [country] = build({
      waste_treatment_incineration_percent: 0.6,
      waste_treatment_open_dumpsite_percent: 0.6,
      composition_msw_plastic_percent: 1,
    }).countries;
    expect(country.treatment?.year).toBe(2021);
    expect(country.treatment?.shares.recycling).toBeNull();
    expect(country.treatment?.shares.incineration).toBe(50);
    expect(country.composition?.year).toBe(2019);
  });

  it('should summarize recycling over the countries that report it only', () => {
    const { world } = build({
      waste_treatment_recycling_percent: 0.5,
      waste_treatment_other_percent: 0.5,
    });
    expect(world.recycling).toEqual({
      sharePercent: 50,
      countries: 1,
      populationSharePercent: 100,
    });
  });

  it('should fail on a country with data but no year in the codebook', () => {
    expect(() =>
      buildDataset(
        [labels, keys, row({ ...base, waste_treatment_recycling_percent: 1 })],
        [codebook[0]],
        '2026-11-11',
      ),
    ).toThrow('treatment data without a year in the codebook');
  });

  it('should fail when a required machine key is missing', () => {
    const header = keys.filter((key) => key !== 'waste_treatment_recycling_percent');
    expect(() => build({}, header)).toThrow(
      'is missing the columns: waste_treatment_recycling_percent',
    );
  });

  it.each(['waste_treatment_new_method_percent', 'composition_msw_batteries_percent'])(
    'should fail on the unmapped column %s',
    (extraKey) => {
      expect(() => build({}, [...keys, extraKey])).toThrow(
        `Unmapped treatment or composition columns: ${extraKey}`,
      );
    },
  );

  it('should map every treatment and composition group to at least one column', () => {
    for (const columns of [
      ...Object.values(TREATMENT_GROUPS),
      ...Object.values(COMPOSITION_GROUPS),
    ]) {
      expect(columns.length).toBeGreaterThan(0);
    }
  });
});
