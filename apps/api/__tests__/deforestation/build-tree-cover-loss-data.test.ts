import { TREE_COVER_LOSS_DRIVER_IDS } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import { GFW_DRIVERS_ORIGIN } from '../../src/modules/deforestation/deforestation.constants';
import {
  buildTreeCoverLossData,
  type BuildTreeCoverLossInput,
} from '../../src/modules/deforestation/tree-cover-loss.service';

import { syntheticSeries, treeCoverLossInput } from './helpers';

type Data = ReturnType<typeof buildTreeCoverLossData>['data'];

function entity(data: Data, code: string): Data['entities'][number] {
  const found = data.entities.find((candidate) => candidate.code === code);
  if (found === undefined) {
    throw new Error(`entity ${code} missing from the fixture payload`);
  }
  return found;
}

/** Every driver gets the same series, so the World passes the minimum-years check. */
function uniformInput(points: [number, number | null][]): BuildTreeCoverLossInput {
  const base = treeCoverLossInput();
  return {
    ...base,
    drivers: Object.fromEntries(
      TREE_COVER_LOSS_DRIVER_IDS.map((id) => [id, [syntheticSeries('OWID_WRL', 'World', points)]]),
    ) as BuildTreeCoverLossInput['drivers'],
  };
}

describe('buildTreeCoverLossData', () => {
  it('should align every driver by year from 2001 to the latest year', () => {
    const { data } = buildTreeCoverLossData(treeCoverLossInput());

    expect(data.startYear).toBe(2001);
    expect(data.endYear).toBe(2024);
    for (const served of data.entities) {
      for (const id of TREE_COVER_LOSS_DRIVER_IDS) {
        expect(served[id]).toHaveLength(24);
      }
    }
  });

  it('should list the seven drivers with their source names in stacking order', () => {
    const { data } = buildTreeCoverLossData(treeCoverLossInput());

    expect(data.drivers).toEqual([
      { id: 'permanentAgriculture', name: 'Permanent agriculture' },
      { id: 'hardCommodities', name: 'Hard commodities (mining and energy)' },
      { id: 'settlementsInfrastructure', name: 'Settlements and infrastructure' },
      { id: 'shiftingCultivation', name: 'Shifting cultivation' },
      { id: 'logging', name: 'Logging' },
      { id: 'wildfire', name: 'Wildfire' },
      { id: 'otherNaturalDisturbances', name: 'Other natural disturbances' },
    ]);
    expect(data.drivers.map(({ id }) => id)).toEqual([...TREE_COVER_LOSS_DRIVER_IDS]);
  });

  it('should put World first and round the real World values to whole hectares', () => {
    const { data } = buildTreeCoverLossData(treeCoverLossInput());
    const world = entity(data, 'OWID_WRL');

    expect(data.entities[0].code).toBe('OWID_WRL');
    expect(world.wildfire[23]).toBe(13_877_225);
    expect(world.permanentAgriculture[23]).toBe(6_753_056);
    expect(world.settlementsInfrastructure[23]).toBe(159_262);
    expect(world.hardCommodities[23]).toBe(254_961);
    expect(data.unit).toBe('hectares');
  });

  it('should keep a blank driver cell as null while the other drivers keep their values', () => {
    const { data } = buildTreeCoverLossData(treeCoverLossInput());
    const uruguay = entity(data, 'URY');

    expect(uruguay.shiftingCultivation.every((value) => value === null)).toBe(true);
    expect(uruguay.settlementsInfrastructure[0]).toBe(29);
    expect(uruguay.logging[0]).toBe(5948);
  });

  it('should keep a value below half a hectare as zero, not null', () => {
    const { data } = buildTreeCoverLossData(
      uniformInput([
        [2001, 0.3],
        [2002, 2],
      ]),
    );

    expect(entity(data, 'OWID_WRL').logging).toEqual([0, 2]);
  });

  it('should carry no total, no regrouping and no deforestation field in the payload', () => {
    const { data } = buildTreeCoverLossData(treeCoverLossInput());

    expect(Object.keys(data.entities[0]).sort()).toEqual(
      ['code', 'iso2', 'name', ...TREE_COVER_LOSS_DRIVER_IDS].sort(),
    );
  });

  it('should credit the GFW origin with the required credit under CC BY 4.0', () => {
    const { data } = buildTreeCoverLossData(treeCoverLossInput());

    expect(data.origin).toBe(GFW_DRIVERS_ORIGIN);
    expect(data.origin.notice).toContain('Tree cover loss by dominant driver');
    expect(data.origin.license.name).toBe('CC BY 4.0');
  });

  it('should identify the dataset and take lastUpdated from the indicator', () => {
    const { data, lastUpdated } = buildTreeCoverLossData(treeCoverLossInput());

    expect(data.dataset).toEqual({
      name: 'Tree Cover Loss by Dominant Driver',
      version: '2025-08-26',
    });
    expect(lastUpdated).toBe('2026-08-12T10:24:03.000Z');
  });

  it('should fail when the indicator unit is not hectares', () => {
    const input = treeCoverLossInput();
    input.metadata = { ...input.metadata, unit: 'square kilometers' };

    expect(() => buildTreeCoverLossData(input)).toThrow(ProviderDataError);
  });

  it('should fail when the response has no World entity', () => {
    const input = treeCoverLossInput();
    for (const id of TREE_COVER_LOSS_DRIVER_IDS) {
      input.drivers[id] = input.drivers[id].filter(({ entityCode }) => entityCode !== 'OWID_WRL');
    }

    expect(() => buildTreeCoverLossData(input)).toThrow(ProviderDataError);
  });

  it('should fail when the response has no value in any year', () => {
    expect(() => buildTreeCoverLossData(uniformInput([[2001, null]]))).toThrow(ProviderDataError);
  });

  it('should fail when World has a single year', () => {
    expect(() => buildTreeCoverLossData(uniformInput([[2024, 5]]))).toThrow(/fewer than 2 years/);
  });
});
