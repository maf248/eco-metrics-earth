import { formatShare } from '@/lib/formatNumber';
import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { ForestAreaData } from '@eco-metrics/shared';

/**
 * The key figures say "an area the size of Mexico" only for a net loss whose rounded value, in
 * million hectares, lies inside this inclusive range. Mexico covers 196.4 million hectares of
 * total area (1,964,375 km2, INEGI; about 194 million hectares of land): the range is about -8%
 * to +9.5% around it, so "the size of" never overstates the comparison.
 */
export const MEXICO_CLAUSE_MIN_MHA = 180;
export const MEXICO_CLAUSE_MAX_MHA = 215;

/** A piece of the sentence; `strong` pieces are the figures, wrapped in `<strong>`. */
export interface TextSegment {
  text: string;
  strong?: boolean;
}

const MILLION = 1_000_000;
const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** The plain text of a sentence made of segments. */
export function segmentsText(segments: readonly TextSegment[]): string {
  return segments.map(({ text }) => text).join('');
}

/**
 * The key figures sentence, derived from the World entity of the forest area payload: the net
 * change in forest area since the first year and the share of the world's land under forest in
 * the latest year. `undefined` when the World lacks the first value, the last value or the last
 * share, so the page shows nothing rather than a guess.
 */
export function buildForestKeyFigures({
  startYear,
  endYear,
  entities,
}: Pick<ForestAreaData, 'startYear' | 'endYear' | 'entities'>): TextSegment[] | undefined {
  const world = entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  const first = world?.area[0];
  const last = world?.area[endYear - startYear];
  const share = world?.share[endYear - startYear];
  if (
    first === null ||
    first === undefined ||
    last === null ||
    last === undefined ||
    share === null ||
    share === undefined
  ) {
    return undefined;
  }

  const net = (last - first) / MILLION;
  const rounded = Math.round(Math.abs(net));
  const sharePart: TextSegment[] = [
    { text: ' Forests now cover ' },
    { text: `${formatShare(share)}%`, strong: true },
    { text: " of the world's land." },
  ];

  if (rounded === 0) {
    return [
      { text: `Since ${startYear} the world's forest area has hardly changed.` },
      ...sharePart,
    ];
  }

  const loss = net < 0;
  const withMexico = loss && rounded >= MEXICO_CLAUSE_MIN_MHA && rounded <= MEXICO_CLAUSE_MAX_MHA;
  return [
    { text: `Since ${startYear} the world has ${loss ? 'lost' : 'gained'} a net ` },
    { text: `${integerFormatter.format(rounded)} million hectares`, strong: true },
    { text: ` of forest${withMexico ? ', an area the size of Mexico' : ''}.` },
    ...sharePart,
  ];
}
