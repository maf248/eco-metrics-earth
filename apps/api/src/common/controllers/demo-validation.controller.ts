import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateMetricDto } from '../dto/create-metric.dto';
import { GetMetricsQueryDto } from '../dto/get-metrics-query.dto';

/**
 * @deprecated MOCK CONTROLLER — will be removed when real eco modules are implemented.
 */
@ApiTags('Demo')
@Controller('demo-validation')
export class DemoValidationController {
  @Get()
  @ApiOperation({
    summary: '[DEPRECATED] Get metrics (mock)',
    description:
      'Mock endpoint that echoes query parameters. Will be replaced by real eco-category endpoints.',
    deprecated: true,
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Start date (ISO 8601)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'End date (ISO 8601)',
    example: '2025-12-31',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Eco category slug',
    example: 'air-quality',
  })
  @ApiResponse({ status: 200, description: 'Query echoed back' })
  getMetrics(@Query() query: GetMetricsQueryDto): { query: GetMetricsQueryDto } {
    return { query };
  }

  @Post()
  @ApiOperation({
    summary: '[DEPRECATED] Create metric (mock)',
    description:
      'Mock endpoint that echoes the request body. Will be replaced by real eco-category endpoints.',
    deprecated: true,
  })
  @ApiBody({ type: CreateMetricDto, description: 'Metric data to echo' })
  @ApiResponse({ status: 201, description: 'Body echoed back' })
  createMetric(@Body() body: CreateMetricDto): { body: CreateMetricDto } {
    return { body };
  }
}
