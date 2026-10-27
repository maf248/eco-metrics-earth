import {
  ENERGY_SOURCE_LABELS,
  generationAt,
  largestSource,
  latestYear,
  renewablesShare,
  sharesOf,
} from '@/lib/energyMix';
import { formatShare } from '@/lib/formatNumber';
import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { EnergySourcesData } from '@eco-metrics/shared';

interface EnergyKeyFiguresProps {
  data: Pick<EnergySourcesData, 'startYear' | 'entities'>;
}

/**
 * Server-rendered headline figures for the World in its latest year: the share
 * of renewables and the largest single source. Derived from the same payload as
 * the charts; plain text, so it is indexable and readable without JavaScript.
 */
export function EnergyKeyFigures({ data }: EnergyKeyFiguresProps) {
  const world = data.entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  const year = world && latestYear(world, data.startYear);
  if (!world || year === undefined) {
    return null;
  }
  const shares = sharesOf(generationAt(world.generation, year - data.startYear));
  const largest = largestSource(shares);
  const renewables = renewablesShare(shares);
  if (!largest || renewables === null) {
    return null;
  }

  return (
    <div data-testid="energy-key-figures" className="text-fg-body">
      <p className="text-xl leading-relaxed sm:text-2xl">
        In {year}, renewables generated{' '}
        <strong className="whitespace-nowrap font-bold text-fg">{formatShare(renewables)}%</strong>{' '}
        of the world&apos;s electricity.
      </p>
      <p className="mt-2 text-lg leading-relaxed sm:text-xl">
        The largest single source was {ENERGY_SOURCE_LABELS[largest.id].toLowerCase()}, at{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {formatShare(largest.share)}%
        </strong>
        .
      </p>
    </div>
  );
}
