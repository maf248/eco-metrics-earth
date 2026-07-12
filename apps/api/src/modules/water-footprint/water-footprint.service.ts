import { readFileSync } from 'fs';
import { join } from 'path';

import { WaterFootprintProduct, waterFootprintCategorySlugMap } from '@eco-metrics/shared';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class WaterFootprintService {
  private readonly products: WaterFootprintProduct[];

  constructor() {
    const filePath = join(__dirname, '../../data/water-footprint.json');

    let raw: string;
    try {
      raw = readFileSync(filePath, 'utf8');
    } catch (error: unknown) {
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
