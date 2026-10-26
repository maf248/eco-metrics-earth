import { formatPerCapita, formatTotal } from '@/lib/formatNumber';
import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { Co2EmissionsData } from '@eco-metrics/shared';

interface LatestFigures {
  year: number;
  total: number;
  perCapita: number;
}

/** Latest year for which the World has both values, skipping trailing nulls. */
export function latestWorldFigures({
  startYear,
  endYear,
  entities,
}: Co2EmissionsData): LatestFigures | undefined {
  const world = entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  if (!world) {
    return undefined;
  }
  for (let year = endYear; year >= startYear; year--) {
    const total = world.total[year - startYear];
    const perCapita = world.perCapita[year - startYear];
    if (total !== null && perCapita !== null) {
      return { year, total, perCapita };
    }
  }
  return undefined;
}

interface Co2KeyFiguresProps {
  data: Co2EmissionsData;
}

/**
 * Server-rendered headline figures for the World, derived from the same payload
 * as the chart. Plain text, so they are indexable and readable without JavaScript.
 */
export function Co2KeyFigures({ data }: Co2KeyFiguresProps) {
  const figures = latestWorldFigures(data);
  if (!figures) {
    return null;
  }

  return (
    <p data-testid="co2-key-figures" className="text-xl leading-relaxed text-fg-body sm:text-2xl">
      In {figures.year} the world emitted{' '}
      <strong className="whitespace-nowrap font-bold text-fg">
        {formatTotal(figures.total)} million tonnes
      </strong>{' '}
      of CO2,{' '}
      <strong className="whitespace-nowrap font-bold text-fg">
        {formatPerCapita(figures.perCapita)} tonnes
      </strong>{' '}
      per person.
    </p>
  );
}
