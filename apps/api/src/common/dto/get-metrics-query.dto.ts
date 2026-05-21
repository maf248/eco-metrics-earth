import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO for metric listing query parameters.
 *
 * @deprecated MOCK — remove when real eco modules are implemented in P2
 */
export class GetMetricsQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
