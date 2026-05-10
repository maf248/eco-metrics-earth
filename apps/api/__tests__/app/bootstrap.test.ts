import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';

import { AppModule } from '../../src/app/app.module';

describe('API bootstrap smoke test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 with status ok', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });
});
