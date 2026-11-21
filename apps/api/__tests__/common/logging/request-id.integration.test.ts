import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';

import { AppModule } from '../../../src/app/app.module';
import { applyGlobalPipeline } from '../../../src/app/global-pipeline';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';

describe('X-Request-ID on the real application', () => {
  let app: INestApplication;
  let previousKey: string | undefined;

  beforeAll(async () => {
    previousKey = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = 'k'.repeat(32);

    app = await NestFactory.create(AppModule, { logger: false });
    applyGlobalPipeline(app);
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previousKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = previousKey;
    }
  });

  it('should generate a UUID v4 per request when nothing is sent', async () => {
    const first = await supertest(app.getHttpServer()).get('/api/v1/health').expect(200);
    const second = await supertest(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(first.headers['x-request-id']).toMatch(UUID_V4);
    expect(second.headers['x-request-id']).toMatch(UUID_V4);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  it('should echo a safe incoming X-Request-ID', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-ID', 'web-1234.abcd_EF')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('web-1234.abcd_EF');
  });

  it.each([
    ['too short', 'short'],
    ['too long', 'a'.repeat(65)],
    ['containing a space', 'has a space in it'],
  ])('should replace an unsafe incoming X-Request-ID that is %s', async (_label, value) => {
    const response = await supertest(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-ID', value)
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(UUID_V4);
    expect(JSON.stringify(response.headers)).not.toContain(value);
  });

  it('should use the trace id of a traceparent when no request id is sent', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/api/v1/health')
      .set('traceparent', `00-${TRACE_ID}-00f067aa0ba902b7-01`)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(TRACE_ID);
  });

  it('should carry the header on a 401 from the internal key guard', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/api/v1/water-footprint/products')
      .expect(401);

    expect(response.headers['x-request-id']).toMatch(UUID_V4);
  });

  it('should carry the header on a 404', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('X-Internal-Api-Key', 'k'.repeat(32))
      .expect(404);

    expect(response.headers['x-request-id']).toMatch(UUID_V4);
  });
});
