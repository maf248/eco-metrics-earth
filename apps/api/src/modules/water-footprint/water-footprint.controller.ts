import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  ApiResponse,
  WaterFootprintProduct,
  waterFootprintCategorySlugMap,
} from '@eco-metrics/shared';

import { WaterFootprintService } from './water-footprint.service';

@ApiTags('Water Footprint')
@Controller('water-footprint')
export class WaterFootprintController {
  constructor(private readonly service: WaterFootprintService) {}

  @Get('products')
  @ApiOperation({
    summary: 'Get product water footprint data',
    description:
      'Returns water footprint data for consumer products, optionally filtered by category.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Category slug filter',
    enum: Object.keys(waterFootprintCategorySlugMap),
  })
  @ApiOkResponse({ description: 'Products returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid category filter.' })
  getProducts(@Query('category') category?: string): ApiResponse<WaterFootprintProduct[]> {
    const data =
      category === undefined ? this.service.getAllProducts() : this.service.getByCategory(category);

    return { success: true, data, status: 200 };
  }
}
