import { HttpService } from '@nestjs/axios';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import { throwError } from 'rxjs';
import supertest from 'supertest';

import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { buildLoggerParams } from '../../src/common/logging/logger-options';
import { envValidationSchema } from '../../src/config/env-validation.schema';
import { HealthModule } from '../../src/health/health.module';
import {
  type CapturedStream,
  closeLoggingApp,
  createCapturedStream,
  settleLogs,
} from '../common/logging/logging-harness';

describe('failed dependencies check with the pino logger installed', () => {
  let app: INestApplication;
  let captured: CapturedStream;

  beforeAll(async () => {
    captured = createCapturedStream();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        LoggerModule.forRoot(
          buildLoggerParams(
            { logLevel: 'info', nodeEnv: 'production', gcpProjectId: undefined },
            captured.stream,
          ),
        ),
        HealthModule,
      ],
    })
      .overrideProvider(HttpService)
      .useValue({
        request: () =>
          throwError(() =>
            Object.assign(new Error('connect ECONNREFUSED'), { isAxiosError: true }),
          ),
      })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useLogger(app.get(Logger));
    applyGlobalPipeline(app);
    await app.init();
    captured.clear();
  });

  afterAll(async () => {
    await closeLoggingApp(app);
  });

  it('should write exactly one ERROR entry with the request id, even though the 503 bypasses the filter', async () => {
    const response = await supertest(app.getHttpServer()).get('/health/dependencies').expect(503);
    await settleLogs();

    // Terminus logs its own failure through the Nest Logger (now pino); pino-http stays silent on 5xx.
    const lines = captured.lines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      severity: 'ERROR',
      requestId: response.headers['x-request-id'],
    });
    expect(lines[0].message).toEqual(expect.stringContaining('Health Check has failed'));
    expect(lines[0].message).toEqual(expect.stringContaining('owid'));
  });
});
