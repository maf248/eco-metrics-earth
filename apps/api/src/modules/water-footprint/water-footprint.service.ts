import { readFileSync } from 'fs';
import { join } from 'path';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import {
  DataSourcePublication,
  DataSourcePublisher,
  WaterFootprintProduct,
  waterFootprintCategorySlugMap,
} from '@eco-metrics/shared';

import { resolvePublisher } from '../../common/publishers/resolve-publisher';
import {
  DataSourceContribution,
  DataSourceContributor,
  DataSourceContributorProvider,
} from '../data-sources/data-source-contributor';

const PUBLISHED_YEAR_PATTERN = /\((\d{4})\)/g;

@DataSourceContributor()
@Injectable()
export class WaterFootprintService implements DataSourceContributorProvider {
  private readonly products: WaterFootprintProduct[];

  private readonly logger = new Logger(WaterFootprintService.name);

  constructor() {
    const filePath = join(__dirname, 'data/water-footprint.json');

    let raw: string;
    try {
      raw = readFileSync(filePath, 'utf8');
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        this.logger.warn(
          `Water footprint data file not found at ${filePath} — initializing with empty dataset.`,
        );
        this.products = [];
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load water footprint data from ${filePath}: ${message}`, {
        cause: error,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse water footprint data: ${message}`, {
        cause: error,
      });
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Failed to parse water footprint data: expected a JSON array of products.');
    }

    this.products = (parsed as WaterFootprintProduct[]).map((row) => this.withPublisher(row));
  }

  getAllProducts(): WaterFootprintProduct[] {
    return [...this.products];
  }

  getByCategory(slug: string): WaterFootprintProduct[] {
    // Own-property check: a plain lookup would resolve inherited keys such as
    // `constructor` or `__proto__` and silently accept them as valid slugs.
    if (!Object.hasOwn(waterFootprintCategorySlugMap, slug)) {
      const valid = Object.keys(waterFootprintCategorySlugMap).join(', ');
      throw new BadRequestException(`Invalid category filter. Valid values: ${valid}`);
    }

    const category = waterFootprintCategorySlugMap[slug];
    return this.products.filter((product) => product.category === category);
  }

  getDataSources(): DataSourceContribution[] {
    if (this.products.length === 0) {
      return [];
    }

    const publications = new Map<string, DataSourcePublication>();
    for (const { source, sourceUrl, publisher, product } of this.products) {
      const key = JSON.stringify([source, sourceUrl]);
      const existing = publications.get(key);

      if (existing) {
        existing.entryCount += 1;
      } else {
        publications.set(key, {
          citation: source,
          url: sourceUrl,
          publishedYear: this.parsePublishedYear(product, source),
          entryCount: 1,
          ...(publisher && { publisher }),
        });
      }
    }

    return [
      {
        kind: 'dataset',
        source: {
          id: 'water-footprint',
          name: 'Water footprint of products',
          description:
            'Water footprint values for consumer products, compiled from the publications cited below.',
          categories: ['water-footprint'],
          publications: [...publications.values()],
        },
      },
    ];
  }

  /** Validates the row at load time, so a malformed dataset stops the boot. */
  private withPublisher(row: WaterFootprintProduct): WaterFootprintProduct {
    this.parsePublishedYear(row.product, row.source);

    let publisher: DataSourcePublisher | undefined;
    try {
      publisher = resolvePublisher(row.sourceUrl);
    } catch (error: unknown) {
      throw new Error(
        `Water footprint product "${row.product}" has an invalid sourceUrl "${row.sourceUrl}" (source: "${row.source}").`,
        { cause: error },
      );
    }

    return publisher ? { ...row, publisher } : row;
  }

  private parsePublishedYear(product: string, source: string): number {
    const matches = [...source.matchAll(PUBLISHED_YEAR_PATTERN)];

    if (matches.length !== 1) {
      throw new Error(
        `Water footprint product "${product}" must cite exactly one "(YYYY)" publication year in its source, got "${source}".`,
      );
    }

    return Number(matches[0][1]);
  }
}
