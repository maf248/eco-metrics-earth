import { readFileSync } from 'fs';
import { join } from 'path';

import { WaterFootprintProduct, waterFootprintCategorySlugMap } from '@eco-metrics/shared';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

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

    try {
      this.products = JSON.parse(raw) as WaterFootprintProduct[];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse water footprint data: ${message}`, {
        cause: error,
      });
    }
  }

  getAllProducts(): WaterFootprintProduct[] {
    return [...this.products];
  }

  getByCategory(slug: string): WaterFootprintProduct[] {
    const category = waterFootprintCategorySlugMap[slug];

    if (!category) {
      const valid = Object.keys(waterFootprintCategorySlugMap).join(', ');
      throw new BadRequestException(`Invalid category filter. Valid values: ${valid}`);
    }

    return this.products.filter((product) => product.category === category);
  }
}
