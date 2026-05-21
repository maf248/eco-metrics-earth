// MOCK CONTROLLER — remove when real eco modules are implemented in P2

import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CreateMetricDto } from './create-metric.dto';
import { GetMetricsQueryDto } from './get-metrics-query.dto';

@Controller('demo-validation')
export class DemoValidationController {
  @Get()
  getMetrics(@Query() query: GetMetricsQueryDto): { query: GetMetricsQueryDto } {
    return { query };
  }

  @Post()
  createMetric(@Body() body: CreateMetricDto): { body: CreateMetricDto } {
    return { body };
  }
}
