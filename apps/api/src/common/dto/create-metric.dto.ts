import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMetricDto {
  @ApiProperty({ description: 'Metric name', example: 'co2_ppm' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Metric value', example: 415.7 })
  @IsNumber()
  @Type(() => Number)
  value!: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'ppm' })
  @IsString()
  @IsNotEmpty()
  unit!: string;
}
