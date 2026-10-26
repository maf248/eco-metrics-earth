import { formatAnomaly } from '@/lib/formatNumber';
import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { GlobalTemperatureData, GlobalTemperatureGlobal } from '@eco-metrics/shared';

interface YearAnomaly {
  year: number;
  anomaly: number;
}

interface WorldFigures {
  latest: YearAnomaly;
  warmest: YearAnomaly;
}

/**
 * The World's latest year with a value (skipping trailing nulls) and its warmest
 * year in the series. When several years tie for the maximum, the most recent
 * one is named.
 */
export function worldTemperatureFigures({
  startYear,
  endYear,
  entities,
}: Pick<GlobalTemperatureData, 'startYear' | 'endYear' | 'entities'>): WorldFigures | undefined {
  const world = entities.find(({ code }) => code === WORLD_ENTITY_CODE);
  if (!world) {
    return undefined;
  }

  let latest: YearAnomaly | undefined;
  let warmest: YearAnomaly | undefined;
  for (let year = startYear; year <= endYear; year++) {
    const anomaly = world.anomaly[year - startYear];
    if (anomaly === null) {
      continue;
    }
    latest = { year, anomaly };
    if (warmest === undefined || anomaly >= warmest.anomaly) {
      warmest = { year, anomaly };
    }
  }

  return latest && warmest ? { latest, warmest } : undefined;
}

/** The latest year of the World's pre-industrial series that has a mean value. */
export function latestGlobalFigure({
  startYear,
  endYear,
  mean,
}: Pick<GlobalTemperatureGlobal, 'startYear' | 'endYear' | 'mean'>): YearAnomaly | undefined {
  for (let year = endYear; year >= startYear; year--) {
    const anomaly = mean[year - startYear];
    if (anomaly !== null) {
      return { year, anomaly };
    }
  }
  return undefined;
}

interface GlobalTemperatureKeyFiguresProps {
  data: GlobalTemperatureData;
}

/**
 * Server-rendered headline figures for the World, derived from the same payload
 * as the chart. Plain text, so they are indexable and readable without
 * JavaScript. "Relative to" keeps the sentence true for negative values; the
 * baseline and the first year come from the payload.
 */
export function GlobalTemperatureKeyFigures({ data }: GlobalTemperatureKeyFiguresProps) {
  const figures = worldTemperatureFigures(data);
  if (!figures) {
    return null;
  }
  const { baseline, startYear, unit } = data;
  const { latest, warmest } = figures;
  const preIndustrial = latestGlobalFigure(data.global);
  const preIndustrialPeriod = `${data.global.baseline.startYear}–${data.global.baseline.endYear}`;

  return (
    <div data-testid="global-temperature-key-figures" className="text-fg-body">
      <p className="text-xl leading-relaxed sm:text-2xl">
        In {latest.year} the world&apos;s average surface temperature was{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {formatAnomaly(latest.anomaly)} {unit}
        </strong>{' '}
        relative to the {baseline.startYear}–{baseline.endYear} average.
      </p>
      <p className="mt-2 text-lg leading-relaxed sm:text-xl">
        The warmest year since {startYear} was {warmest.year}, at{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {formatAnomaly(warmest.anomaly)} {unit}
        </strong>
        .
      </p>
      {preIndustrial && (
        <p
          data-testid="global-temperature-preindustrial-figure"
          className="mt-2 text-lg leading-relaxed sm:text-xl"
        >
          In {preIndustrial.year} the world was{' '}
          <strong className="whitespace-nowrap font-bold text-fg">
            {formatAnomaly(preIndustrial.anomaly)} {unit}
          </strong>{' '}
          {preIndustrial.anomaly > 0 ? 'warmer than' : 'relative to'} the {preIndustrialPeriod}{' '}
          (pre-industrial) average.
        </p>
      )}
    </div>
  );
}
