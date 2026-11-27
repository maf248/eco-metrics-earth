import {
  buildForestKeyFigures,
  MEXICO_CLAUSE_MAX_MHA,
  MEXICO_CLAUSE_MIN_MHA,
  segmentsText,
} from '@/lib/deforestationKeyFigures';
import type { ForestAreaData } from '@eco-metrics/shared';

import { FOREST_FIXTURE } from '../fixtures/deforestation';

type Input = Pick<ForestAreaData, 'startYear' | 'endYear' | 'entities'>;

/** A two-year payload whose World goes from `first` to `last` hectares, ending at 31.905802%. */
function world(first: number | null, last: number | null, share: number | null = 31.905802): Input {
  return {
    startYear: 1990,
    endYear: 1991,
    entities: [
      { code: 'OWID_WRL', iso2: null, name: 'World', area: [first, last], share: [null, share] },
    ],
  };
}

const MILLION = 1_000_000;
const text = (input: Input): string | undefined => {
  const segments = buildForestKeyFigures(input);
  return segments && segmentsText(segments);
};

describe('buildForestKeyFigures', () => {
  it('should read the agreed sentence from the real World values', () => {
    const segments = buildForestKeyFigures(FOREST_FIXTURE);

    expect(segments && segmentsText(segments)).toBe(
      "Since 1990 the world has lost a net 203 million hectares of forest, an area the size of Mexico. Forests now cover 31.9% of the world's land.",
    );
    expect(segments?.filter(({ strong }) => strong).map(({ text: value }) => value)).toEqual([
      '203 million hectares',
      '31.9%',
    ]);
  });

  it('should omit the Mexico clause outside the range', () => {
    const sentence = text(world(1000 * MILLION, 850 * MILLION));

    expect(sentence).toBe(
      "Since 1990 the world has lost a net 150 million hectares of forest. Forests now cover 31.9% of the world's land.",
    );
    expect(sentence).not.toContain('Mexico');
  });

  it.each([
    [179, false],
    [MEXICO_CLAUSE_MIN_MHA, true],
    [MEXICO_CLAUSE_MAX_MHA, true],
    [216, false],
  ])('should treat a net loss of %s million hectares at the Mexico boundary', (loss, clause) => {
    expect(text(world(1000 * MILLION, (1000 - loss) * MILLION))).toContain(
      clause ? 'the size of Mexico' : 'forest. Forests',
    );
  });

  it('should say gained for a net gain, with no Mexico clause even in range', () => {
    const sentence = text(world(1000 * MILLION, 1190 * MILLION));

    expect(sentence).toContain('the world has gained a net 190 million hectares of forest.');
    expect(sentence).not.toContain('Mexico');
  });

  it('should say the forest has hardly changed when the rounded change is 0', () => {
    expect(text(world(1000 * MILLION, 1000.3 * MILLION))).toBe(
      "Since 1990 the world's forest area has hardly changed. Forests now cover 31.9% of the world's land.",
    );
  });

  it('should take the start year from the data', () => {
    expect(
      text({ ...world(1000 * MILLION, 850 * MILLION), startYear: 1992, endYear: 1993 }),
    ).toMatch(/^Since 1992 /);
  });

  it('should group thousands of million hectares with the US locale', () => {
    expect(text(world(9000 * MILLION, 3000 * MILLION))).toContain('6,000 million hectares');
  });

  it.each([
    ['the first value', world(null, 1)],
    ['the last value', world(1, null)],
    ['the last share', world(1, 1, null)],
  ])('should return nothing when the World lacks %s', (_label, input) => {
    expect(buildForestKeyFigures(input)).toBeUndefined();
  });

  it('should return nothing without a World entity', () => {
    expect(buildForestKeyFigures({ ...FOREST_FIXTURE, entities: [] })).toBeUndefined();
  });
});
