import { WASTE_TREATMENT_GROUPS } from '@/lib/wasteMeasures';
import { getWasteRecycling, isWasteRecyclingData } from '@/lib/wasteRecycling';

import { WASTE_FIXTURE, WASTE_META } from '../fixtures/wasteRecycling';

describe('getWasteRecycling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const respondWith = (payload: unknown): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  it('should resolve with the data and the attribution meta', async () => {
    const fetchMock = respondWith({
      success: true,
      status: 200,
      data: WASTE_FIXTURE,
      meta: WASTE_META,
    });

    const result = await getWasteRecycling();

    expect(result).toEqual({ data: WASTE_FIXTURE, meta: WASTE_META });
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v1/waste-recycling');
  });

  it('should throw when the payload does not match after both attempts', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    respondWith({ success: true, status: 200, data: { countries: [] }, meta: WASTE_META });

    await expect(getWasteRecycling()).rejects.toThrow(
      'Waste and recycling data could not be fetched from the BFF',
    );
  });
});

describe('isWasteRecyclingData', () => {
  const withCountry = (patch: Record<string, unknown>) => ({
    ...WASTE_FIXTURE,
    countries: [{ ...WASTE_FIXTURE.countries[0], ...patch }],
  });

  it('should accept the fixture, with and without treatment and composition', () => {
    expect(isWasteRecyclingData(WASTE_FIXTURE)).toBe(true);
  });

  it('should accept a country that reports no year', () => {
    const [first] = WASTE_FIXTURE.countries;
    expect(
      isWasteRecyclingData(
        withCountry({ generation: { ...first.generation, reportedYear: null } }),
      ),
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['no countries', { ...WASTE_FIXTURE, countries: [] }],
    ['no world block', { countries: WASTE_FIXTURE.countries }],
    [
      'a world without the recycling summary',
      { ...WASTE_FIXTURE, world: { generation: WASTE_FIXTURE.world.generation } },
    ],
    ['a country without a name', withCountry({ name: undefined })],
    ['a non-numeric population', withCountry({ population: 'many' })],
    ['a country without generation', withCountry({ generation: undefined })],
    ['a treatment without shares', withCountry({ treatment: { year: 2020 } })],
    [
      'a non-numeric composition share',
      withCountry({ composition: { year: 2020, shares: { foodOrganic: 'x' } } }),
    ],
    ['a non-object country', { ...WASTE_FIXTURE, countries: ['x'] }],
    [
      'a treatment with nothing reported',
      withCountry({
        treatment: {
          year: 2020,
          shares: Object.fromEntries(WASTE_TREATMENT_GROUPS.map((group) => [group, null])),
        },
      }),
    ],
    [
      'a non-numeric reported year',
      withCountry({
        generation: { ...WASTE_FIXTURE.countries[0].generation, reportedYear: '2022' },
      }),
    ],
    [
      'a treatment with an unknown share key',
      withCountry({
        treatment: {
          year: 2020,
          shares: {
            ...Object.fromEntries(WASTE_TREATMENT_GROUPS.map((group) => [group, 1])),
            incinerationWithEnergy: 1,
          },
        },
      }),
    ],
    ['no dataset identity', { ...WASTE_FIXTURE, dataset: undefined }],
    ['a dataset without a citation', { ...WASTE_FIXTURE, dataset: { title: 'x' } }],
  ])('should reject %s', (_label, data) => {
    expect(isWasteRecyclingData(data)).toBe(false);
  });
});
