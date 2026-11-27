import type { ReactNode } from 'react';

import { KEY_FIGURES_CLASS_NAME } from '@/lib/cardClassNames';
import {
  deriveAcidityFigure,
  deriveSeaLevelRise,
  deriveSstFigure,
  deriveWarmingFigure,
} from '@/lib/oceanHealthKeyFigures';
import type { OceanHealthSections } from '@/lib/oceanHealthStructuredData';
import type { ApiResponseMeta, DataSourceOrigin } from '@eco-metrics/shared';

interface FigureProps {
  testId: string;
  label: string;
  value: ReactNode;
  /** One or two short lines under the value: what, when and against what. */
  children: ReactNode;
  source: string;
}

/**
 * One figure. Below `sm` the figures stack, so a hairline between them keeps each one apart;
 * from `sm` up the two-column grid and its gap do that.
 */
function Figure({ testId, label, value, children, source }: FigureProps) {
  return (
    <li
      data-testid={testId}
      className="border-t border-line-divider py-6 first:border-t-0 first:pt-0 last:pb-0 sm:border-t-0 sm:py-0"
    >
      <p className="text-sm font-medium text-fg-secondary">{label}</p>
      <p className="mt-1 whitespace-nowrap text-3xl font-bold text-fg sm:text-4xl">{value}</p>
      <div className="mt-2 space-y-1 text-sm text-fg-body">{children}</div>
      <p className="mt-2 text-xs text-fg-muted">Source: {source}</p>
    </li>
  );
}

/** The producer, and the republisher when it is a different organisation. */
function sourceOf(origin: DataSourceOrigin, meta: ApiResponseMeta, name = origin.producer): string {
  const provider = meta.source.provider;
  return provider === origin.producer ? name : `${name}, via ${provider}`;
}

interface OceanKeyFiguresProps {
  /** The sections whose payload is shown; a missing section contributes no figure. */
  sections: OceanHealthSections;
}

/**
 * The headline figures of the page, one per section that has data, each derived from that
 * section's own payload and naming its period and source: the latest daily sea surface
 * temperature, the ocean's warming, the sea level rise and the change in acidity. Server-rendered
 * text with the dates in `<time>`, so it is indexable and readable without JavaScript. The copy
 * never says "today": the page is cached for a day and every source lags real time.
 */
export function OceanKeyFigures({ sections }: OceanKeyFiguresProps) {
  const { sst, anomaly, seaLevel, ph } = sections;
  const figures: ReactNode[] = [];

  if (sst) {
    const { data, meta } = sst;
    const { unit, coverage, baseline, startYear } = data;
    const { latest, record } = deriveSstFigure(data);
    figures.push(
      <Figure
        key="sst"
        testId="ocean-key-figure-sst"
        label="Latest daily sea surface temperature"
        value={`${latest.sst}\u00a0${unit}`}
        source={meta.source.provider}
      >
        <p>
          <strong className="whitespace-nowrap font-semibold text-fg">
            {latest.anomaly}&nbsp;{unit}
          </strong>{' '}
          vs the {baseline.startYear}–{baseline.endYear} average, ocean between{' '}
          <span className="whitespace-nowrap">{coverage}</span>, on{' '}
          <time dateTime={latest.date}>{latest.dateText}</time>
          {latest.preliminary ? ' (preliminary value, may still change slightly)' : ''}
        </p>
        <p>
          {record ? (
            <>
              Daily record since {startYear}: {record.sst}&nbsp;{unit} on{' '}
              <time dateTime={record.date}>{record.dateText}</time>
            </>
          ) : (
            <>This is the daily record since {startYear}.</>
          )}
        </p>
      </Figure>,
    );
  }

  const warming = anomaly && deriveWarmingFigure(anomaly.data);
  if (anomaly && warming) {
    const { data, meta } = anomaly;
    figures.push(
      <Figure
        key="warming"
        testId="ocean-key-figure-warming"
        label="Ocean warming"
        value={`${warming.anomaly}\u00a0${data.unit}`}
        source={sourceOf(data.origin, meta)}
      >
        <p>
          World sea surface temperature in {warming.year}, vs the {data.baseline.startYear}–
          {data.baseline.endYear} average
        </p>
        <p>
          {warming.warmest
            ? `Warmest year: ${warming.warmest.year} (${warming.warmest.anomaly}\u00a0${data.unit})`
            : `The warmest year since ${warming.firstYear}.`}
        </p>
      </Figure>,
    );
  }

  if (seaLevel) {
    const { data, meta } = seaLevel;
    const rise = deriveSeaLevelRise(data);
    figures.push(
      <Figure
        key="sea-level"
        testId="ocean-key-figure-sea-level"
        label="Sea level rise"
        value={`${rise.changeCmText}\u00a0cm`}
        source={sourceOf(data.origin, meta)}
      >
        <p>
          Global mean sea level, <time dateTime={rise.first.date}>{rise.first.monthText}</time> to{' '}
          <time dateTime={rise.latest.date}>{rise.latest.monthText}</time>
        </p>
        <p>
          Trend: {data.trend.value}&nbsp;{data.trend.unit}
        </p>
      </Figure>,
    );
  }

  const acidity = ph && deriveAcidityFigure(ph.data);
  if (ph && acidity) {
    const { data, meta } = ph;
    figures.push(
      <Figure
        key="acidity"
        testId="ocean-key-figure-acidity"
        label="Ocean acidity"
        value={`${acidity.percentText}%`}
        source={sourceOf(data.origin, meta, data.origin.title)}
      >
        <p>
          {acidity.moreAcidic ? 'More' : 'Less'} acidic at {data.station}, {acidity.first.year}–
          {acidity.latest.year}
        </p>
        <p>
          pH {acidity.moreAcidic ? 'fell' : 'rose'} from {acidity.first.ph} to {acidity.latest.ph}{' '}
          (yearly averages)
        </p>
      </Figure>,
    );
  }

  if (figures.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Key figures"
      data-testid="ocean-key-figures"
      className={KEY_FIGURES_CLASS_NAME}
    >
      <ul className="grid sm:grid-cols-2 sm:gap-8">{figures}</ul>
    </section>
  );
}
