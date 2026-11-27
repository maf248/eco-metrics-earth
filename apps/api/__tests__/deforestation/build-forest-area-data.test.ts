import { listCountryEntityCodes } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import { FAO_FRA_ORIGIN } from '../../src/modules/deforestation/deforestation.constants';
import {
  buildForestAreaData,
  type BuildForestAreaInput,
} from '../../src/modules/deforestation/forest-area.service';

import { forestAreaInput, syntheticSeries } from './helpers';

function entity(
  data: ReturnType<typeof buildForestAreaData>['data'],
  code: string,
): ReturnType<typeof buildForestAreaData>['data']['entities'][number] {
  const found = data.entities.find((candidate) => candidate.code === code);
  if (found === undefined) {
    throw new Error(`entity ${code} missing from the fixture payload`);
  }
  return found;
}

/** A synthetic input where World has a constant land area unless `landArea` says otherwise. */
function syntheticInput(
  worldRows: Record<number, { area: number | null; share: number | null }>,
  overrides: Partial<BuildForestAreaInput> = {},
): BuildForestAreaInput {
  const years = Object.keys(worldRows).map(Number);
  const base = forestAreaInput();
  return {
    ...base,
    area: [
      syntheticSeries(
        'OWID_WRL',
        'World',
        years.map((y) => [y, worldRows[y].area]),
      ),
    ],
    share: [
      syntheticSeries(
        'OWID_WRL',
        'World',
        years.map((y) => [y, worldRows[y].share]),
      ),
    ],
    ...overrides,
  };
}

describe('buildForestAreaData', () => {
  it('should align area and share by year from 1990 to the latest year with a value', () => {
    const { data } = buildForestAreaData(forestAreaInput());

    expect(data.startYear).toBe(1990);
    expect(data.endYear).toBe(2025);
    for (const { area, share } of data.entities) {
      expect(area).toHaveLength(36);
      expect(share).toHaveLength(36);
    }
  });

  it('should put World first and the countries after it ordered by name', () => {
    const { data } = buildForestAreaData(forestAreaInput());

    expect(data.entities[0]).toMatchObject({ code: 'OWID_WRL', iso2: null, name: 'World' });
    const names = data.entities.slice(1).map(({ name }) => name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(names).toEqual(
      expect.arrayContaining(['Brazil', 'China', 'Russia', 'Nauru', 'Sudan', 'South Sudan']),
    );
  });

  it('should keep the real World values, whole hectares and a share with two decimals', () => {
    const { data } = buildForestAreaData(forestAreaInput());
    const world = entity(data, 'OWID_WRL');

    expect(world.area[0]).toBe(4_343_532_500);
    expect(world.area[35]).toBe(4_140_214_500);
    expect(world.share[0]).toBe(33.47);
    expect(world.share[35]).toBe(31.91);
    expect(data.units).toEqual({ area: 'hectares', share: '% of land area' });
  });

  it('should keep a country whose forest area is 0 hectares as zero, not null', () => {
    const { data } = buildForestAreaData(forestAreaInput());
    const nauru = entity(data, 'NRU');

    expect(nauru.area.every((value) => value === 0)).toBe(true);
  });

  it('should serve a country under one million hectares in 1990 with its real value', () => {
    const { data } = buildForestAreaData(forestAreaInput());
    const uruguay = entity(data, 'URY');

    expect(uruguay.area[0]).toBe(879_440);
    expect(uruguay.area[35]).toBe(2_024_000);
  });

  it('should identify the dataset from the area indicator, not from the share indicator', () => {
    const { data } = buildForestAreaData(forestAreaInput());

    expect(data.dataset).toEqual({
      name: 'Global Forest Resources Assessment',
      version: '2025-12-05',
    });
  });

  it('should credit the FAO origin under CC BY 4.0', () => {
    const { data } = buildForestAreaData(forestAreaInput());

    expect(data.origin).toBe(FAO_FRA_ORIGIN);
    expect(data.origin.producer).toBe('Food and Agriculture Organization of the United Nations');
    expect(data.origin.license.name).toBe('CC BY 4.0');
  });

  it('should take the latest updatedAt of the two indicators as lastUpdated', () => {
    const { lastUpdated } = buildForestAreaData(forestAreaInput());

    // The share indicator (2026-09-10) is newer than the area indicator (2026-08-12).
    expect(lastUpdated).toBe('2026-09-10T01:11:51.000Z');
  });

  it('should leave regions and income groups out through the allowlist', () => {
    const input = forestAreaInput();
    for (const code of ['OWID_AFR', 'OWID_EUR', 'OWID_HIC']) {
      input.area.push(syntheticSeries(code, code, [[1990, 1]]));
      input.share.push(syntheticSeries(code, code, [[1990, 1]]));
    }

    const { data } = buildForestAreaData(input);

    const codes = data.entities.map(({ code }) => code);
    for (const code of ['OWID_AFR', 'OWID_EUR', 'OWID_HIC']) {
      expect(codes).not.toContain(code);
    }
    expect(codes.every((code) => new Set(listCountryEntityCodes()).has(code))).toBe(true);
  });

  it('should serve a blank share cell as null without shifting the arrays', () => {
    const world = { area: 1_000_000, share: 10 };
    const { data } = buildForestAreaData(
      syntheticInput({
        1990: world,
        1991: { area: 1_000_000, share: null },
        1992: world,
      }),
    );
    const served = entity(data, 'OWID_WRL');

    expect(served.share).toEqual([10, null, 10]);
    expect(served.area).toEqual([1_000_000, 1_000_000, 1_000_000]);
  });

  it('should omit an entity that has no value in any year', () => {
    const input = forestAreaInput();
    input.area.push(syntheticSeries('ABW', 'Aruba', [[1990, null]]));
    input.share.push(syntheticSeries('ABW', 'Aruba', [[1990, null]]));

    const { data } = buildForestAreaData(input);

    expect(data.entities.map(({ code }) => code)).not.toContain('ABW');
  });

  it('should fail when the area indicator unit is not hectares', () => {
    const input = forestAreaInput();
    input.areaMetadata = { ...input.areaMetadata, unit: 'square kilometers' };

    expect(() => buildForestAreaData(input)).toThrow(ProviderDataError);
  });

  it('should fail when the share indicator unit is not a percentage', () => {
    const input = forestAreaInput();
    input.shareMetadata = { ...input.shareMetadata, unit: 'ratio' };

    expect(() => buildForestAreaData(input)).toThrow(ProviderDataError);
  });

  it('should fail when the World land area implied by the share is re-based', () => {
    expect(() =>
      buildForestAreaData(
        syntheticInput({
          1990: { area: 1_000_000, share: 10 },
          1991: { area: 1_000_000, share: 11 },
        }),
      ),
    ).toThrow(/constant land area/);
  });

  it('should accept a World land area that varies by less than 1%', () => {
    expect(() =>
      buildForestAreaData(
        syntheticInput({
          1990: { area: 1_000_000, share: 10 },
          1991: { area: 1_000_000, share: 10.05 },
        }),
      ),
    ).not.toThrow();
  });

  it('should fail when no year has both World measures to check the land area', () => {
    expect(() =>
      buildForestAreaData(
        syntheticInput({
          1990: { area: 1_000_000, share: null },
          1991: { area: 1_000_000, share: null },
        }),
      ),
    ).toThrow(/cannot be checked/);
  });

  it('should fail when the response has no World entity', () => {
    const input = forestAreaInput();
    input.area = input.area.filter(({ entityCode }) => entityCode !== 'OWID_WRL');
    input.share = input.share.filter(({ entityCode }) => entityCode !== 'OWID_WRL');

    expect(() => buildForestAreaData(input)).toThrow(ProviderDataError);
  });

  it('should fail when the response has no value in any year', () => {
    const input = forestAreaInput();
    input.area = [syntheticSeries('OWID_WRL', 'World', [[1990, null]])];
    input.share = [syntheticSeries('OWID_WRL', 'World', [[1990, null]])];

    expect(() => buildForestAreaData(input)).toThrow(ProviderDataError);
  });

  it('should fail when World has a single year, as a chart opened on its map tab answers', () => {
    expect(() =>
      buildForestAreaData(syntheticInput({ 2025: { area: 1_000_000, share: 10 } })),
    ).toThrow(/fewer than 2 years/);
  });
});
