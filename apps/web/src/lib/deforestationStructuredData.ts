import {
  buildMultiProviderDatasetJsonLd,
  buildSourceWork,
  type SourceWork,
} from '@/lib/datasetJsonLd';
import type {
  ApiResponseMeta,
  DataSourceOrigin,
  ForestAreaData,
  TreeCoverLossData,
} from '@eco-metrics/shared';

interface Payload<T> {
  data: T;
  meta: ApiResponseMeta;
}

/** The sections that have data to show; an unavailable section is simply absent. */
export interface DeforestationSections {
  forestArea?: Payload<ForestAreaData>;
  treeCoverLoss?: Payload<TreeCoverLossData>;
}

interface StructuredDataInput {
  sections: DeforestationSections;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
}

function originWork({ title, producer, url }: DataSourceOrigin): SourceWork {
  return buildSourceWork({ name: title, publisher: { name: producer }, url });
}

/**
 * schema.org `Dataset` for the deforestation page, built from the sections that are present (an
 * unavailable section contributes nothing, and with none present there is nothing to describe).
 * One dataset, not one block per chart; `isBasedOn` credits the upstream producer of each
 * present section.
 */
export function buildDeforestationDatasetJsonLd({
  sections,
  pageUrl,
  dataSourcesUrl,
}: StructuredDataInput): Record<string, unknown> | undefined {
  const { forestArea, treeCoverLoss } = sections;
  const metas: ApiResponseMeta[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  const variableMeasured: Record<string, unknown>[] = [];
  const isBasedOn: SourceWork[] = [];
  const parts: string[] = [];

  if (forestArea) {
    const { data, meta } = forestArea;
    metas.push(meta);
    starts.push(data.startYear);
    ends.push(data.endYear);
    variableMeasured.push(
      { '@type': 'PropertyValue', name: 'Forest area', unitText: data.units.area },
      {
        '@type': 'PropertyValue',
        name: 'Forest area as a share of land area',
        unitText: data.units.share,
      },
    );
    parts.push(
      `forest area by country, ${data.startYear}–${data.endYear}, in hectares and as a share of ` +
        'land area, with the net change in forest area since the first year',
    );
    isBasedOn.push(originWork(data.origin));
  }

  if (treeCoverLoss) {
    const { data, meta } = treeCoverLoss;
    metas.push(meta);
    starts.push(data.startYear);
    ends.push(data.endYear);
    variableMeasured.push({
      '@type': 'PropertyValue',
      name: 'Tree cover loss by dominant driver',
      unitText: data.unit,
    });
    parts.push(
      `tree cover loss detected by satellite, ${data.startYear}–${data.endYear}, split into ` +
        `${data.drivers.length} dominant causes`,
    );
    isBasedOn.push(originWork(data.origin));
  }

  if (metas.length === 0) {
    return undefined;
  }

  return buildMultiProviderDatasetJsonLd({
    metas,
    pageUrl,
    dataSourcesUrl,
    fields: {
      name: 'Forest area and tree cover loss by country',
      description:
        `Forests by country: ${parts.join('; ')}. Net change in forest area and tree cover loss ` +
        `are different measures and are not combined. Republished by ${metas[0].source.provider}.`,
      keywords: [
        'forest area',
        'tree cover loss',
        'forest loss',
        'world map',
        'country ranking',
        'countries',
      ],
      temporalCoverage: `${Math.min(...starts)}/${Math.max(...ends)}`,
      variableMeasured,
      isBasedOn,
    },
  });
}
