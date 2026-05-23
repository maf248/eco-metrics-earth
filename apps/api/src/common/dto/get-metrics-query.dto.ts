import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetMetricsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Eco category slug', example: 'air-quality' })
  @IsOptional()
  @IsString()
  category?: string;
}
