import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';

import { FallbackModule } from '../../../src/common/fallback/fallback.module';
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter';

@Controller('known')
class KnownRouteController {
  @Get()
  get(): { ok: boolean } {
    return { ok: true };
  }
}

describe('FallbackController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [FallbackModule],
      controllers: [KnownRouteController],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should not shadow real routes registered before the fallback', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/known').expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it('should return JSON 404 for unmapped routes using the global filter shape', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/nonexistent').expect(404);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      success: false,
      error: 'Cannot GET /api/v1/nonexistent',
      status: 404,
    });
  });

  it('should reflect the HTTP method in the 404 error message', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/api/v1/nonexistent')
      .send({})
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      error: 'Cannot POST /api/v1/nonexistent',
      status: 404,
    });
  });
});
