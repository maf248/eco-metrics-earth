import { readFileSync } from 'fs';
import { join } from 'path';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { WaterFootprintProduct, waterFootprintCategorySlugMap } from '@eco-metrics/shared';

@Injectable()
export class WaterFootprintService {
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

    this.products = parsed as WaterFootprintProduct[];
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
}
