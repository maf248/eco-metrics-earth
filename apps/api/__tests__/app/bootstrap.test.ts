import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { AppConfigService } from '../../src/config/app-config.service';

describe('API bootstrap smoke test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    applyGlobalPipeline(app);
    app.setGlobalPrefix('api/v1');

    const appConfig = app.get(AppConfigService);
    app.enableCors({ origin: appConfig.corsOrigins });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 with status ok', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });

  describe('CORS headers', () => {
    it('should reflect the Origin header when it matches an allowed origin', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should omit the ACAO header when the Origin is not allowed', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'https://evil.example');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should omit the ACAO header when no Origin header is sent', async () => {
      const response = await supertest(app.getHttpServer()).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('removed scaffold routes', () => {
    it.each([
      ['GET', '/api/v1/'],
      ['GET', '/api/v1'],
      ['GET', '/api/v1/demo-validation'],
      ['POST', '/api/v1/demo-validation'],
    ] as const)('should return the standard JSON 404 for %s %s', async (method, url) => {
      const server = supertest(app.getHttpServer());
      const response = method === 'GET' ? await server.get(url) : await server.post(url).send({});

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({ success: false, error: expect.any(String), status: 404 });
    });
  });
});
