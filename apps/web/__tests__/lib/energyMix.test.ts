import {
  ENERGY_SOURCE_LABELS,
  generationAt,
  largestSource,
  latestYear,
  renewablesShare,
  shareSeries,
  sharesOf,
} from '@/lib/energyMix';
import { ENERGY_SOURCE_IDS } from '@eco-metrics/shared';

import { energyEntity, entityWith } from '../fixtures/energySources';

describe('energyMix', () => {
  it('should label the eight sources in the fixed order', () => {
    expect(ENERGY_SOURCE_IDS.map((id) => ENERGY_SOURCE_LABELS[id])).toEqual([
      'Coal',
      'Gas',
      'Oil',
      'Nuclear',
      'Hydro',
      'Wind',
      'Solar',
      'Bioenergy & other renewables',
    ]);
  });

  describe('sharesOf', () => {
    it('should derive shares from present generation that add up to 100', () => {
      const shares = sharesOf(generationAt(entityWith({ coal: [60], gas: [40] }).generation, 0));

      expect(shares.coal).toBe(60);
      expect(shares.gas).toBe(40);
      expect(shares.oil).toBeNull();
      expect(shares.bioenergyOther).toBeNull();
    });

    it('should give a year without generation no shares at all', () => {
      const allNull = sharesOf(generationAt(entityWith({ coal: [null] }).generation, 0));
      const zero = sharesOf(generationAt(entityWith({ coal: [0], gas: [0] }).generation, 0));

      expect(Object.values(allNull).every((value) => value === null)).toBe(true);
      expect(Object.values(zero).every((value) => value === null)).toBe(true);
    });

    it('should keep an explicit zero as a zero share', () => {
      const shares = sharesOf(generationAt(entityWith({ coal: [0], gas: [10] }).generation, 0));

      expect(shares.coal).toBe(0);
      expect(shares.gas).toBe(100);
    });
  });

  it('should derive a share series with the entity arrays length', () => {
    const series = shareSeries(energyEntity('ARG'));

    expect(series.coal).toHaveLength(3);
    const total = ENERGY_SOURCE_IDS.reduce((sum, id) => sum + (series[id][2] ?? 0), 0);
    expect(total).toBeCloseTo(100, 10);
  });

  describe('latestYear', () => {
    it('should skip trailing years without generation', () => {
      expect(latestYear(energyEntity('DZA'), 2023)).toBe(2024);
      expect(latestYear(energyEntity('ARG'), 2023)).toBe(2025);
    });

    it('should be undefined when no year has generation', () => {
      expect(latestYear(entityWith({ coal: [0, null] }), 2023)).toBeUndefined();
    });
  });

  describe('renewablesShare and largestSource', () => {
    const world = generationAt(energyEntity('OWID_WRL').generation, 2);
    const shares = sharesOf(world);

    it('should sum the renewable shares', () => {
      expect(renewablesShare(shares)).toBeCloseTo(33.76, 1);
    });

    it('should return null rather than zero when no renewable has a share', () => {
      const fossilOnly = sharesOf(
        generationAt(entityWith({ coal: [60], gas: [40] }).generation, 0),
      );

      expect(renewablesShare(fossilOnly)).toBeNull();
    });

    it('should name the greatest source, coal, with its share', () => {
      const largest = largestSource(shares);

      expect(largest?.id).toBe('coal');
      expect(largest?.share).toBeCloseTo(32.96, 1);
    });

    it('should give a tie to the earlier source in the fixed order', () => {
      const tied = sharesOf(generationAt(entityWith({ coal: [50], gas: [50] }).generation, 0));

      expect(largestSource(tied)?.id).toBe('coal');
    });

    it('should return undefined without any share', () => {
      expect(
        largestSource(sharesOf(generationAt(entityWith({ coal: [null] }).generation, 0))),
      ).toBe(undefined);
    });
  });
});
