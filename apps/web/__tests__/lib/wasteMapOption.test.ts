import { buildWasteMapOption } from '@/lib/wasteMapOption';
import { WORLD_MAP_NAME, type WorldRegion } from '@/lib/worldGeometry';

import { WASTE_COUNTRIES } from '../fixtures/wasteRecycling';

const REGIONS: WorldRegion[] = [
  { key: 'DEU', code: 'DEU', name: 'Germany' },
  { key: 'CHN', code: 'CHN', name: 'China' },
  { key: 'BRA', code: 'BRA', name: 'Brazil' },
  { key: 'region:Somaliland', code: null, name: 'Somaliland' },
];

interface MapItem {
  name: string;
  value: number;
  label?: string;
  year?: string;
  note?: string | null;
  silent?: boolean;
}
interface MapOption {
  tooltip: { formatter: (params: { data?: Partial<MapItem> }) => string };
  visualMap: { pieces: { lt?: number; gte?: number }[] };
  series: { map: string; data: MapItem[] }[];
}

const build = (measure: Parameters<typeof buildWasteMapOption>[0]['measure']): MapOption =>
  buildWasteMapOption({
    regions: REGIONS,
    countries: WASTE_COUNTRIES,
    measure,
  }) as unknown as MapOption;
const item = (option: MapOption, name: string): MapItem | undefined =>
  option.series[0].data.find((entry) => entry.name === name);

describe('buildWasteMapOption', () => {
  it('should color the world geometry in five classes from the measure breaks', () => {
    const option = build('recycled');

    expect(option.series[0].map).toBe(WORLD_MAP_NAME);
    expect(option.visualMap.pieces).toEqual([
      { lt: 10 },
      { gte: 10, lt: 25 },
      { gte: 25, lt: 40 },
      { gte: 40, lt: 60 },
      { gte: 60 },
    ]);
  });

  it('should give a country with a value its data year, and a country without one no data', () => {
    const option = build('recycled');

    expect(item(option, 'DEU')).toMatchObject({ value: 47, label: 'Germany', year: '2022' });
    expect(item(option, 'CHN')).toMatchObject({ silent: true });
    expect(Number.isNaN(item(option, 'CHN')?.value)).toBe(true);
    expect(item(option, 'region:Somaliland')).toMatchObject({ silent: true });
  });

  it('should carry the unreported part of recycled or composted into the tooltip', () => {
    const option = build('recycledOrComposted');
    const brazil = item(option, 'BRA');

    expect(brazil).toMatchObject({ value: 1.6, note: 'Composting is not reported' });
    expect(option.tooltip.formatter({ data: brazil })).toContain('Composting is not reported');
  });

  it('should colour every country of the dataset for waste per person, as a 2022 estimate', () => {
    const option = build('perPerson');

    expect(item(option, 'CHN')).toMatchObject({ value: 0.97, year: '2022 estimate' });
    expect(option.tooltip.formatter({ data: item(option, 'DEU') })).toContain('2022 estimate');
  });

  it('should return an empty tooltip for a region without data', () => {
    expect(build('recycled').tooltip.formatter({ data: item(build('recycled'), 'CHN') })).toBe('');
  });
});

describe('map selection', () => {
  const selectedOption = (selectedCode: string | null): MapOption =>
    buildWasteMapOption({
      regions: REGIONS,
      countries: WASTE_COUNTRIES,
      measure: 'recycled',
      selectedCode,
    }) as unknown as MapOption;

  it('should mark only the selected country and enable single selection', () => {
    const option = selectedOption('DEU');

    expect(item(option, 'DEU')).toMatchObject({ selected: true });
    expect(item(option, 'BRA')).not.toHaveProperty('selected');
    expect((option.series[0] as unknown as { selectedMode: string }).selectedMode).toBe('single');
  });

  it('should select nothing by default', () => {
    expect(item(build('recycled'), 'DEU')).not.toHaveProperty('selected');
  });
});

describe('map tooltip', () => {
  it('should escape the country name', () => {
    const countries = WASTE_COUNTRIES.map((country) =>
      country.code === 'DEU' ? { ...country, name: '<b>x</b>' } : country,
    );
    const option = buildWasteMapOption({
      regions: REGIONS,
      countries,
      measure: 'recycled',
    }) as unknown as MapOption;

    expect(option.tooltip.formatter({ data: item(option, 'DEU') })).toBe(
      '<strong>&lt;b&gt;x&lt;/b&gt;</strong> · 2022<br/>47.0%',
    );
  });
});
