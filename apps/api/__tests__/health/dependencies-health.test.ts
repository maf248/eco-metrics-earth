import { readFileSync } from 'fs';
import { join } from 'path';

import { HttpService } from '@nestjs/axios';
import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Observable, of, throwError } from 'rxjs';
import supertest from 'supertest';

import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { OUTBOUND_FETCH } from '../../src/common/http/outbound-http-client.service';
import { InternalKeyGuard } from '../../src/common/internal-key/internal-key.guard';
import { AppConfigService } from '../../src/config/app-config.service';
import { envValidationSchema } from '../../src/config/env-validation.schema';
import { HealthController } from '../../src/health/health.controller';
import { HealthModule } from '../../src/health/health.module';
import { OwidModule } from '../../src/modules/providers/owid/owid.module';

interface HttpRequestConfig {
  url: string;
  timeout: number;
  headers: Record<string, string>;
}

type Responder = (config: HttpRequestConfig) => Observable<unknown>;

function axiosError(message: string, response?: { status: number; statusText: string }): Error {
  return Object.assign(new Error(message), { isAxiosError: true, response });
}

describe('GET /health/dependencies', () => {
  let app: INestApplication;
  let responder: Responder;
  const request = jest.fn((config: HttpRequestConfig) => responder(config));

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        HealthModule,
      ],
    })
      .overrideProvider(HttpService)
      .useValue({ request })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    applyGlobalPipeline(app);
    await app.init();
  });

  beforeEach(() => {
    request.mockClear();
    // Terminus logs failed checks through its own ConsoleLogger instance.
    jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should answer 200 with the owid indicator up when the provider is reachable', async () => {
    responder = () => of({ status: 200, data: {} });

    const response = await supertest(app.getHttpServer()).get('/health/dependencies');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.info.owid.status).toBe('up');
  });

  it('should answer 503 with the Terminus body on a connection error', async () => {
    responder = () => throwError(() => axiosError('connect ECONNREFUSED'));

    const response = await supertest(app.getHttpServer()).get('/health/dependencies');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.error.owid.status).toBe('down');
    expect(response.body.details.owid.status).toBe('down');
    expect(response.body).not.toHaveProperty('success');
  });

  it('should answer 503 and include the status code when the provider answers 500', async () => {
    responder = () =>
      throwError(() => axiosError('Request failed', { status: 500, statusText: 'Server Error' }));

    const response = await supertest(app.getHttpServer()).get('/health/dependencies');

    expect(response.status).toBe(503);
    expect(response.body.error.owid.statusCode).toBe(500);
  });

  it('should probe the light chart metadata URL with a 3 second timeout and the API User-Agent', async () => {
    responder = () => of({ status: 200, data: {} });

    await supertest(app.getHttpServer()).get('/health/dependencies');

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://ourworldindata.org/grapher/co-emissions-per-capita.metadata.json',
        timeout: 3000,
        headers: { 'User-Agent': expect.stringContaining('eco-metrics-earth-api') },
      }),
    );
  });

  it('should rethrow unexpected errors through the global filter as 500', async () => {
    responder = () => throwError(() => new Error('not an axios error'));

    const response = await supertest(app.getHttpServer()).get('/health/dependencies');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Internal server error',
      status: 500,
    });
  });
});

describe('liveness independence from providers', () => {
  let app: INestApplication;
  const httpRequest = jest.fn(() => throwError(() => axiosError('down')));
  const transport = jest.fn(() => Promise.reject(new Error('provider down')));

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        HealthModule,
        OwidModule,
      ],
    })
      .overrideProvider(HttpService)
      .useValue({ request: httpRequest })
      .overrideProvider(OUTBOUND_FETCH)
      .useValue(transport)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should answer GET /health with ok without invoking any provider stub', async () => {
    const response = await supertest(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(httpRequest).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it('should resolve HealthController with no providers at all', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    expect(moduleRef.get(HealthController).check()).toEqual({ status: 'ok' });
  });

  it('should keep the Cloud Run startup probe on the liveness path', () => {
    const workflow = readFileSync(
      join(__dirname, '../../../../.github/workflows/deploy-api.yml'),
      'utf-8',
    );

    expect(workflow).toContain('httpGet.path=/api/v1/health,');
    expect(workflow).not.toContain('httpGet.path=/api/v1/health/dependencies');
  });

  it('should cap each Cloud Run target at its instance limit through the single target mapping', () => {
    const workflow = readFileSync(
      join(__dirname, '../../../../.github/workflows/deploy-api.yml'),
      'utf-8',
    );

    expect(workflow).toContain('max_instances="2"');
    expect(workflow).toContain('max_instances="1"');
    expect(workflow).toContain('--max-instances=${{ steps.target.outputs.max_instances }}');
  });
});

describe('GET /health/dependencies behind the global InternalKeyGuard', () => {
  const SECRET = 's'.repeat(32);
  let guardedApp: INestApplication;
  const request = jest.fn(() => of({ status: 200, data: {} }));

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        HealthModule,
      ],
      providers: [
        { provide: AppConfigService, useValue: { internalApiKey: SECRET } },
        { provide: APP_GUARD, useClass: InternalKeyGuard },
      ],
    })
      .overrideProvider(HttpService)
      .useValue({ request })
      .compile();
    guardedApp = moduleRef.createNestApplication({ logger: false });
    applyGlobalPipeline(guardedApp);
    await guardedApp.init();
  });

  beforeEach(() => {
    request.mockClear();
  });

  afterAll(async () => {
    await guardedApp.close();
  });

  it('should answer 401 without a provider call when the key is missing', async () => {
    const response = await supertest(guardedApp.getHttpServer()).get('/health/dependencies');

    expect(response.status).toBe(401);
    expect(request).not.toHaveBeenCalled();
  });

  it('should answer 401 without a provider call when the key is wrong', async () => {
    const response = await supertest(guardedApp.getHttpServer())
      .get('/health/dependencies')
      .set('X-Internal-Api-Key', 'w'.repeat(32));

    expect(response.status).toBe(401);
    expect(request).not.toHaveBeenCalled();
  });

  it('should call the provider and answer 200 with the valid key', async () => {
    const response = await supertest(guardedApp.getHttpServer())
      .get('/health/dependencies')
      .set('X-Internal-Api-Key', SECRET);

    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
