import {
  buildMultiProviderDatasetJsonLd,
  buildSourceWork,
  type SourceWork,
} from '@/lib/datasetJsonLd';
import { formatDayMonthYear } from '@/lib/oceanHealthKeyFigures';
import type {
  ApiResponseMeta,
  DataSourceOrigin,
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
} from '@eco-metrics/shared';

interface Payload<T> {
  data: T;
  meta: ApiResponseMeta;
}

/** The sections that have data to show; an unavailable section is simply absent. */
export interface OceanHealthSections {
  sst?: Payload<OceanSstDailyData>;
  anomaly?: Payload<OceanSstAnomalyData>;
  heat?: Payload<OceanHeatContentData>;
  seaLevel?: Payload<OceanSeaLevelData>;
  ph?: Payload<OceanPhData>;
}

interface StructuredDataInput {
  sections: OceanHealthSections;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
}

/** The ISO date range a section covers. */
interface Coverage {
  from: string;
  to: string;
}

function yearCoverage(startYear: number, endYear: number): Coverage {
  return { from: `${startYear}-01-01`, to: `${endYear}-12-31` };
}

function originWork({ title, producer, url }: DataSourceOrigin): SourceWork {
  return buildSourceWork({ name: title, publisher: { name: producer }, url });
}

/** The republisher as a source, once per dataset: Our World in Data serves three sections. */
function processorWork({ source }: ApiResponseMeta, name: string, version?: string): SourceWork {
  return buildSourceWork({
    name,
    version,
    publisher: { name: source.provider, url: source.sourceUrl },
    url: source.sourceUrl,
  });
}

/**
 * schema.org `Dataset` describing the data behind the ocean health page, built from the sections
 * that are present (an unavailable section contributes nothing, and with none present there is
 * nothing to describe). It is one dataset, not one block per chart. `isBasedOn` credits every
 * provider that served the data and every upstream producer: the Copernicus Climate Pulse and its
 * producer, Our World in Data as processor and the Met Office, NOAA NCEI, the US EPA and the
 * Hawaii Ocean Time-series, and NOAA's satellite altimetry laboratory, which is its own producer.
 */
export function buildOceanHealthDatasetJsonLd({
  sections,
  pageUrl,
  dataSourcesUrl,
}: StructuredDataInput): Record<string, unknown> | undefined {
  const { sst, anomaly, heat, seaLevel, ph } = sections;
  const metas: ApiResponseMeta[] = [];
  const coverage: Coverage[] = [];
  const variableMeasured: Record<string, unknown>[] = [];
  const isBasedOn: SourceWork[] = [];
  const parts: string[] = [];
  const credited = new Set<string>();
  const addWork = (key: string, work: SourceWork): void => {
    if (!credited.has(key)) {
      credited.add(key);
      isBasedOn.push(work);
    }
  };

  if (sst) {
    const { data, meta } = sst;
    metas.push(meta);
    coverage.push({ from: `${data.startYear}-01-01`, to: data.latest.date });
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: `Daily average sea surface temperature, ${data.coverage}`,
      unitText: data.unit,
    });
    parts.push(
      `the daily average sea surface temperature of the ocean between ${data.coverage} since ` +
        `${data.startYear}, with its ${data.baseline.startYear}–${data.baseline.endYear} climatology, ` +
        `the latest value (${formatDayMonthYear(data.latest.date)}) and the daily record`,
    );
    addWork(`provider:${meta.source.provider}`, processorWork(meta, meta.source.provider));
    addWork(`origin:${data.origin.title}`, originWork(data.origin));
  }

  if (anomaly) {
    const { data, meta } = anomaly;
    const period = `${data.baseline.startYear}–${data.baseline.endYear}`;
    metas.push(meta);
    coverage.push(yearCoverage(data.startYear, data.endYear));
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: `Annual sea surface temperature anomaly relative to the ${period} average`,
      unitText: data.unit,
    });
    parts.push(
      `the annual sea surface temperature anomaly for the world and each hemisphere, ` +
        `relative to the ${period} average, with its 95% uncertainty range`,
    );
    addWork(
      `dataset:${data.dataset.name}:${data.dataset.version}`,
      processorWork(meta, data.dataset.name, data.dataset.version),
    );
    addWork(`origin:${data.origin.title}`, originWork(data.origin));
  }

  if (heat) {
    const { data, meta } = heat;
    metas.push(meta);
    coverage.push(yearCoverage(data.startYear, data.endYear));
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Ocean heat content of the world, 0–700 m and 0–2000 m',
      unitText: data.unit,
    });
    parts.push(
      `the ocean heat content of the world down to ${data.depths.map(({ label }) => label).join(' and ')}, ` +
        'from several research groups',
    );
    for (const depth of data.depths) {
      addWork(
        `dataset:${depth.dataset.name}:${depth.dataset.version}`,
        processorWork(meta, depth.dataset.name, depth.dataset.version),
      );
    }
    for (const origin of data.origins) {
      addWork(`origin:${origin.title}`, originWork(origin));
    }
    // The research groups behind each series are named in the payload; the last origin (the EPA
    // indicator page) is where their estimates are compiled and documented.
    const compiledAt = data.origins[data.origins.length - 1];
    for (const { id, name } of data.depths.flatMap((depth) => depth.sources)) {
      if (id !== 'noaa') {
        addWork(
          `heat-source:${id}`,
          buildSourceWork({
            name: `${name} ocean heat content estimate`,
            publisher: { name },
            url: compiledAt.url,
          }),
        );
      }
    }
  }

  if (seaLevel) {
    const { data, meta } = seaLevel;
    metas.push(meta);
    coverage.push({ from: data.startDate, to: data.endDate });
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Global mean sea level anomaly from satellite altimetry',
      unitText: data.unit,
    });
    parts.push(
      `the global mean sea level anomaly measured by satellite altimetry, per mission, with its ` +
        `${data.trend.value} ${data.trend.unit} trend`,
    );
    addWork(`origin:${data.origin.title}`, originWork(data.origin));
    // NOAA's laboratory is both the provider and the producer: it is credited once, as the origin.
    if (meta.source.provider !== data.origin.producer) {
      addWork(`provider:${meta.source.provider}`, processorWork(meta, meta.source.provider));
    }
  }

  if (ph) {
    const { data, meta } = ph;
    metas.push(meta);
    coverage.push({ from: data.dates[0], to: data.dates[data.dates.length - 1] });
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: `Ocean ${data.unit} at ${data.station}, monthly and rolling yearly average`,
      unitText: data.unit,
    });
    parts.push(
      `the ocean ${data.unit} measured at ${data.station}, monthly and as a yearly average`,
    );
    addWork(
      `dataset:${data.dataset.name}:${data.dataset.version}`,
      processorWork(meta, data.dataset.name, data.dataset.version),
    );
    addWork(`origin:${data.origin.title}`, originWork(data.origin));
  }

  if (metas.length === 0) {
    return undefined;
  }

  const from = coverage.map((entry) => entry.from).reduce((min, d) => (d < min ? d : min));
  const to = coverage.map((entry) => entry.to).reduce((max, d) => (d > max ? d : max));

  return buildMultiProviderDatasetJsonLd({
    metas,
    pageUrl,
    dataSourcesUrl,
    fields: {
      name: 'Ocean health: sea surface temperature, ocean heat content, sea level and ocean pH',
      description:
        `Global ocean indicators: ${parts.join('; ')}. Daily and annual values for the world ` +
        'ocean, from several providers, each credited with its own license and notice.',
      keywords: [
        'ocean health',
        'sea surface temperature',
        'ocean heat content',
        'sea level rise',
        'ocean acidification',
        'ocean pH',
        'climate change',
      ],
      temporalCoverage: `${from}/${to}`,
      variableMeasured,
      isBasedOn,
    },
  });
}
