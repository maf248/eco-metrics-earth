import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
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
