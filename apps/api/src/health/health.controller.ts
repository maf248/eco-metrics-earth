import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { AllowKeyless } from '../common/internal-key/allow-keyless.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @AllowKeyless()
  @SkipThrottle({ default: true, anonymous: true })
  @ApiOperation({ summary: 'Health check', description: 'Returns OK if the API is running.' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    schema: { example: { status: 'ok' } },
  })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
