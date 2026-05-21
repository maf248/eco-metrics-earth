import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

/**
 * DTO for creating a metric measurement.
 *
 * @deprecated MOCK — remove when real eco modules are implemented in P2
 */
export class CreateMetricDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Type(() => Number)
  value!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;
}
