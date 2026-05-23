import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root endpoint', description: 'Returns a welcome message.' })
  @ApiResponse({
    status: 200,
    description: 'Welcome message',
    schema: { example: { message: 'Hello API' } },
  })
  getData(): { message: string } {
    return this.appService.getData();
  }
}
