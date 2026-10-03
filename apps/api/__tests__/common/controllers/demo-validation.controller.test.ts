import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';

import { AppModule } from '../../../src/app/app.module';

describe('DemoValidationController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/demo-validation', () => {
    it('should return 200 with valid optional query params', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/demo-validation')
        .query({ fromDate: '2025-01-15', toDate: '2025-12-31', category: 'air' })
        .expect(200)
        .expect((res) => {
          expect(res.body.query).toBeDefined();
          expect(res.body.query.fromDate).toBe('2025-01-15');
          expect(res.body.query.category).toBe('air');
        });
    });

    it('should return 200 with no query params (all optional)', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/demo-validation')
        .expect(200)
        .expect((res) => {
          expect(res.body.query).toBeDefined();
        });
    });

    it('should return 400 when fromDate is not a valid date string', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/demo-validation')
        .query({ fromDate: 'not-a-date' })
        .expect(400);
    });

    it('should return 400 when extra query param is sent', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/demo-validation')
        .query({ extraField: 'should-reject' })
        .expect(400);
    });
  });

  describe('POST /api/v1/demo-validation', () => {
    it('should return 201 with valid body', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/demo-validation')
        .send({ name: 'PM2.5', value: 12.5, unit: 'µg/m³' })
        .expect(201)
        .expect((res) => {
          expect(res.body.body.name).toBe('PM2.5');
          expect(res.body.body.value).toBe(12.5);
          expect(res.body.body.unit).toBe('µg/m³');
        });
    });

    it('should transform query string number to actual number', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/demo-validation')
        .send({ name: 'CO2', value: '400', unit: 'ppm' })
        .expect(201)
        .expect((res) => {
          expect(res.body.body.value).toBe(400);
        });
    });

    it('should return 400 when value is not a number', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/demo-validation')
        .send({ name: 'PM2.5', value: 'not-a-number', unit: 'µg/m³' })
        .expect(400);
    });

    it('should return 400 when name is missing', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/demo-validation')
        .send({ value: 10, unit: 'µg/m³' })
        .expect(400);
    });

    it('should return 400 when extra body field is sent', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/demo-validation')
        .send({ name: 'PM2.5', value: 10, unit: 'µg/m³', extraField: 'should-reject' })
        .expect(400);
    });

    it('should return 400 when unit is empty', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/demo-validation')
        .send({ name: 'PM2.5', value: 10, unit: '' })
        .expect(400);
    });
  });
});
