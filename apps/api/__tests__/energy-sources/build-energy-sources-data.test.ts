import { readFileSync } from 'fs';
import { join } from 'path';

import type { MetricSeries } from '@eco-metrics/shared';
import { ENERGY_SOURCE_IDS, listCountryEntityCodes } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import {
  ENERGY_GENERATION_CHART,
  ENERGY_ORIGIN,
  type EnergyRawColumn,
} from '../../src/modules/energy-sources/energy-sources.constants';
import {
  buildEnergySourcesData,
  type BuildEnergySourcesInput,
} from '../../src/modules/energy-sources/energy-sources.service';
import type { OwidIndicatorMetadata } from '../../src/modules/providers/owid/owid.types';
import {
  parseGrapherTable,
  selectGrapherColumn,
} from '../../src/modules/providers/owid/parseGrapherCsv';

const FIXTURES = join(__dirname, 'fixtures');
const COLUMNS = Object.keys(ENERGY_GENERATION_CHART.columns) as EnergyRawColumn[];

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

function fixtureMetadata(): OwidIndicatorMetadata {
  const raw = JSON.parse(readFixture('indicator-1295503-metadata.json')) as Record<
    string,
    unknown
  > & { dimensions: { entities: { values: OwidIndicatorMetadata['entities'] } } };
  return {
    id: raw.id as number,
    name: raw.name as string,
    unit: raw.unit as string,
    shortUnit: raw.shortUnit as string,
    datasetName: raw.datasetName as string,
    datasetVersion: raw.datasetVersion as string,
    timespan: raw.timespan as string,
    updatedAt: raw.updatedAt as string,
    descriptionShort: raw.descriptionShort as string,
    entities: raw.dimensions.entities.values,
  };
}

function fixtureInput(): BuildEnergySourcesInput {
  const table = parseGrapherTable(readFixture('electricity-production-by-source.csv'));
  return {
    generation: Object.fromEntries(
      COLUMNS.map((column) => [
        column,
        selectGrapherColumn(table, ENERGY_GENERATION_CHART.columns[column].column),
      ]),
    ) as Record<EnergyRawColumn, MetricSeries[]>,
    metadata: fixtureMetadata(),
    allowedCodes: new Set(listCountryEntityCodes()),
  };
}

type Row = Partial<Record<EnergyRawColumn, number | null>>;

/** Synthetic input: one entity per code, rows by year, columns absent from a row are blank. */
function syntheticInput(
  entities: Record<string, { name: string; rows: Record<number, Row> }>,
): BuildEnergySourcesInput {
  return {
    generation: Object.fromEntries(
      COLUMNS.map((column) => [
        column,
        Object.entries(entities).map(([code, { name, rows }]) => ({
          entityName: name,
          entityCode: code,
          points: Object.entries(rows).map(([year, row]) => ({
            year: Number(year),
            value: row[column] ?? null,
          })),
        })),
      ]),
    ) as Record<EnergyRawColumn, MetricSeries[]>,
    metadata: fixtureMetadata(),
    allowedCodes: new Set(['OWID_WRL', 'ARG', 'ESP']),
  };
}

const WORLD = { name: 'World', rows: { 2000: { coal: 10 }, 2001: { coal: 11 } } };

describe('buildEnergySourcesData', () => {
  describe('with the captured fixtures', () => {
    const { data, lastUpdated } = buildEnergySourcesData(fixtureInput());

    it('should serve the fixed range from 2000 with World first and flags', () => {
      expect(data.startYear).toBe(2000);
      expect(data.endYear).toBe(2025);
      expect(data.unit).toBe('TWh');
      expect(data.entities[0]).toMatchObject({ code: 'OWID_WRL', iso2: null, name: 'World' });
      expect(data.entities.map(({ code }) => code)).toEqual([
        'OWID_WRL',
        'DZA',
        'ARG',
        'BIH',
        'ESP',
      ]);
      expect(data.entities.find(({ code }) => code === 'ARG')?.iso2).toBe('AR');
    });

    it('should align every array with the year range', () => {
      for (const entity of data.entities) {
        for (const id of ENERGY_SOURCE_IDS) {
          expect(entity.generation[id]).toHaveLength(26);
        }
      }
    });

    it('should keep the fixed source order and carry no share key', () => {
      for (const entity of data.entities) {
        expect(Object.keys(entity.generation)).toEqual([...ENERGY_SOURCE_IDS]);
        expect(Object.keys(entity)).toEqual(['code', 'iso2', 'name', 'generation']);
      }
    });

    it('should round to two decimals and sum bioenergy with other renewables', () => {
      const world = data.entities[0];

      expect(world.generation.coal[25]).toBe(10471.53);
      expect(world.generation.bioenergyOther[25]).toBe(799.74);
    });

    it('should keep blank cells null instead of zero', () => {
      const bosnia = data.entities.find(({ code }) => code === 'BIH');

      expect(bosnia?.generation.gas[0]).toBeNull();
      expect(bosnia?.generation.nuclear[0]).toBeNull();
      expect(bosnia?.generation.gas.filter((value) => value === null).length).toBeGreaterThan(5);
      expect(bosnia?.generation.coal[0]).toBe(5.29);
    });

    it('should keep explicit zeros as zeros', () => {
      const spain = data.entities.find(({ code }) => code === 'ESP');

      expect(spain?.generation.bioenergyOther[25]).toBe(6.41);
      expect(data.entities.find(({ code }) => code === 'DZA')?.generation.coal[0]).toBe(0);
    });

    it('should not serve a zeros-only latest row', () => {
      const algeria = data.entities.find(({ code }) => code === 'DZA');

      expect(algeria?.generation.nuclear[25]).toBeNull();
      expect(algeria?.generation.gas[24]).toBeGreaterThan(0);
    });

    it('should drop an entity whose every row is zeros', () => {
      expect(data.entities.some(({ code }) => code === 'NIU')).toBe(false);
    });

    it('should ignore provider rows before 2000 and aggregates outside the allowlist', () => {
      expect(data.entities.some(({ code }) => code === 'OWID_EU27')).toBe(false);
      expect(JSON.stringify(data)).not.toContain('9999.99');
    });

    it('should identify the dataset, the Ember origin and the provider timestamp', () => {
      expect(data.dataset).toEqual({ name: 'Electricity mix', version: '2026-06-30' });
      expect(data.origin).toBe(ENERGY_ORIGIN);
      expect(lastUpdated).toBe('2026-09-10T01:11:13.000Z');
    });
  });

  describe('bioenergy and other renewables', () => {
    it('should sum the parts before rounding', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: {
            ...WORLD,
            rows: { 2000: { coal: 1, bioenergy: 0.004, otherRenewables: 0.004 } },
          },
        }),
      );

      expect(data.entities[0].generation.bioenergyOther).toEqual([0.01]);
    });

    it('should not let one missing part hide the other', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: {
            ...WORLD,
            rows: { 2000: { coal: 1, bioenergy: null, otherRenewables: 0.5 } },
          },
        }),
      );

      expect(data.entities[0].generation.bioenergyOther).toEqual([0.5]);
    });

    it('should give null when both parts are missing', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({ OWID_WRL: { ...WORLD, rows: { 2000: { coal: 1 } } } }),
      );

      expect(data.entities[0].generation.bioenergyOther).toEqual([null]);
    });
  });

  describe('gaps and empty years', () => {
    it('should keep a missing year inside the range as null', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: {
            ...WORLD,
            rows: { 2000: { coal: 1 }, 2001: { gas: 2 }, 2002: { coal: 3 } },
          },
        }),
      );

      expect(data.entities[0].generation.coal).toEqual([1, null, 3]);
      expect(data.entities[0].generation.gas).toEqual([null, 2, null]);
    });

    it('should ignore empty years when computing endYear', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: { ...WORLD, rows: { 2000: { coal: 1 }, 2001: { nuclear: 0 } } },
          ARG: { name: 'Argentina', rows: { 2000: { coal: 1 }, 2002: { nuclear: 0, gas: null } } },
        }),
      );

      expect(data.endYear).toBe(2000);
      expect(data.entities[0].generation.coal).toHaveLength(1);
    });

    it('should drop an all-zero entity', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: WORLD,
          ESP: { name: 'Spain', rows: { 2000: { coal: 0, gas: 0 }, 2001: {} } },
        }),
      );

      expect(data.entities.map(({ code }) => code)).toEqual(['OWID_WRL']);
    });

    it('should ignore rows before the start year', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: {
            ...WORLD,
            rows: { 1990: { coal: 999 }, 1999: { coal: 999 }, 2000: { coal: 1 } },
          },
        }),
      );

      expect(data.startYear).toBe(2000);
      expect(data.entities[0].generation.coal).toEqual([1]);
    });

    it('should filter aggregates outside the allowlist', () => {
      const { data } = buildEnergySourcesData(
        syntheticInput({
          OWID_WRL: WORLD,
          ARG: { name: 'Argentina', rows: { 2000: { coal: 2 } } },
          OWID_EU27: { name: 'European Union (27)', rows: { 2000: { coal: 3 } } },
        }),
      );

      expect(data.entities.map(({ code }) => code)).toEqual(['OWID_WRL', 'ARG']);
    });
  });

  describe('unusable input', () => {
    it('should reject input without World', () => {
      const input = syntheticInput({ ARG: { name: 'Argentina', rows: { 2000: { coal: 2 } } } });

      expect(() => buildEnergySourcesData(input)).toThrow(ProviderDataError);
    });

    it('should reject input without any generation', () => {
      const input = syntheticInput({ OWID_WRL: { name: 'World', rows: { 2000: { coal: 0 } } } });

      expect(() => buildEnergySourcesData(input)).toThrow(ProviderDataError);
    });
  });
});
