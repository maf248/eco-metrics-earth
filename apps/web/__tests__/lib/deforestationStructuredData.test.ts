import { buildDeforestationDatasetJsonLd } from '@/lib/deforestationStructuredData';
import { formatSignedPercent, formatWhole, formatOneDecimal } from '@/lib/formatNumber';

import { FOREST_PAYLOAD, TREE_COVER_LOSS_PAYLOAD } from '../fixtures/deforestation';

const PAGE_URL = 'https://eco-metrics.earth/deforestation/';
const DATA_SOURCES_URL = 'https://eco-metrics.earth/data-sources/';

const build = (sections: Parameters<typeof buildDeforestationDatasetJsonLd>[0]['sections']) =>
  buildDeforestationDatasetJsonLd({
    sections,
    pageUrl: PAGE_URL,
    dataSourcesUrl: DATA_SOURCES_URL,
  });

const variableNames = (jsonLd: Record<string, unknown> | undefined): string[] =>
  (jsonLd?.variableMeasured as { name: string }[]).map(({ name }) => name);

const sourceNames = (jsonLd: Record<string, unknown> | undefined): string[] =>
  (jsonLd?.isBasedOn as { name: string }[]).map(({ name }) => name);

describe('buildDeforestationDatasetJsonLd', () => {
  it('should describe one Dataset covering both sections', () => {
    const jsonLd = build({ forestArea: FOREST_PAYLOAD, treeCoverLoss: TREE_COVER_LOSS_PAYLOAD });

    expect(jsonLd?.['@type']).toBe('Dataset');
    expect(jsonLd?.name).toBe('Forest area and tree cover loss by country');
    expect(jsonLd?.url).toBe(PAGE_URL);
    expect(jsonLd?.temporalCoverage).toBe('1990/2025');
    expect(variableNames(jsonLd)).toEqual([
      'Forest area',
      'Forest area as a share of land area',
      'Tree cover loss by dominant driver',
    ]);
    expect(sourceNames(jsonLd)).toEqual([
      'Global Forest Resources Assessment 2025',
      'Tree cover loss by dominant driver (Sims et al., 2025)',
    ]);
    expect(jsonLd?.creator).toMatchObject({ name: 'Our World in Data' });
    expect(String(jsonLd?.description).length).toBeGreaterThanOrEqual(50);
  });

  it('should not use deforestation as a keyword: neither measure is a deforestation figure', () => {
    const jsonLd = build({ forestArea: FOREST_PAYLOAD, treeCoverLoss: TREE_COVER_LOSS_PAYLOAD });
    const keywords = jsonLd?.keywords as string[];

    expect(keywords).toEqual(
      expect.arrayContaining(['forest area', 'forest loss', 'tree cover loss']),
    );
    expect(keywords.join(' ')).not.toMatch(/deforestation/i);
  });

  it('should leave out the tree cover loss variable and source when only forest area is present', () => {
    const jsonLd = build({ forestArea: FOREST_PAYLOAD });

    expect(variableNames(jsonLd)).toEqual(['Forest area', 'Forest area as a share of land area']);
    expect(sourceNames(jsonLd)).toEqual(['Global Forest Resources Assessment 2025']);
    expect(jsonLd?.temporalCoverage).toBe('1990/2025');
  });

  it('should leave out the forest area when only tree cover loss is present', () => {
    const jsonLd = build({ treeCoverLoss: TREE_COVER_LOSS_PAYLOAD });

    expect(variableNames(jsonLd)).toEqual(['Tree cover loss by dominant driver']);
    expect(jsonLd?.temporalCoverage).toBe('2001/2024');
  });

  it('should produce nothing when no section is present', () => {
    expect(build({})).toBeUndefined();
  });
});

describe('forest number formatters', () => {
  it('should sign a percentage change with the real minus sign', () => {
    expect(formatSignedPercent(-21.43)).toBe('−21.4%');
    expect(formatSignedPercent(44.6)).toBe('+44.6%');
    expect(formatSignedPercent(0)).toBe('0.0%');
  });

  it('should group whole numbers and keep one decimal', () => {
    expect(formatWhole(4140214.4)).toBe('4,140,214');
    expect(formatOneDecimal(4343.5325)).toBe('4,343.5');
  });
});
