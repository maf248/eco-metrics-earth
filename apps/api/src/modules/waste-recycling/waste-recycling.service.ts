import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';

import type { WasteRecyclingData } from '@eco-metrics/shared';

import {
  DataSourceContribution,
  DataSourceContributor,
  DataSourceContributorProvider,
} from '../data-sources/data-source-contributor';

import {
  WASTE_RECYCLING_CITATION,
  WASTE_RECYCLING_LICENSE,
  WASTE_RECYCLING_PUBLISHED_YEAR,
  WASTE_RECYCLING_SOURCE_URL,
  WASTE_RECYCLING_TITLE,
} from './waste-recycling.attribution';
import { WasteRecyclingDataset, isWasteRecyclingDataset } from './waste-recycling.validation';

/** The dataset's own dates, for the response metadata. */
interface WasteRecyclingDates {
  /** Last update of the World Bank files, `YYYY-MM-DD`. */
  lastUpdated: string;
  /** Day the workbook was retrieved, `YYYY-MM-DD`. */
  retrieved: string;
}

@DataSourceContributor()
@Injectable()
export class WasteRecyclingService implements DataSourceContributorProvider {
  private readonly dataset: WasteRecyclingDataset;

  /** Loads the bundled dataset once; a missing or malformed file stops the boot. */
  constructor() {
    const filePath = join(__dirname, 'data/waste-recycling.json');

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load waste recycling data from ${filePath}: ${message}`, {
        cause: error,
      });
    }

    if (!isWasteRecyclingDataset(parsed)) {
      throw new Error(`Failed to load waste recycling data from ${filePath}: unexpected shape.`);
    }
    this.dataset = parsed;
  }

  getData(): WasteRecyclingData {
    const { world, countries } = this.dataset;
    return {
      dataset: { title: WASTE_RECYCLING_TITLE, citation: WASTE_RECYCLING_CITATION },
      world,
      countries,
    };
  }

  getDates(): WasteRecyclingDates {
    const { lastUpdated, retrieved } = this.dataset;
    return { lastUpdated, retrieved };
  }

  getDataSources(): DataSourceContribution[] {
    return [
      {
        kind: 'dataset',
        source: {
          id: 'waste-recycling',
          name: 'Municipal waste by country',
          description: `Municipal waste generated, treated and recycled in ${this.dataset.countries.length} countries and territories, with projections to 2050.`,
          categories: ['waste-recycling'],
          publications: [
            {
              citation: WASTE_RECYCLING_CITATION,
              url: WASTE_RECYCLING_SOURCE_URL,
              publishedYear: WASTE_RECYCLING_PUBLISHED_YEAR,
              entryCount: this.dataset.countries.length,
              license: WASTE_RECYCLING_LICENSE,
            },
          ],
        },
      },
    ];
  }
}
