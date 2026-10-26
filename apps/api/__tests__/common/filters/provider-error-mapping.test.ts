import { BadRequestException, Controller, Get, INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';

import { applyGlobalPipeline } from '../../../src/app/global-pipeline';
import { ProviderDataError, ProviderError } from '../../../src/common/errors/provider-error';
import { OutboundHttpStatusError } from '../../../src/common/http/outbound-http-errors';
import { OwidParseError } from '../../../src/modules/providers/owid/owid-errors';

const PROVIDER_URL = 'https://provider.example.test/secret/path?token=abc';

// Test-only error: unknown to the filter, it only extends ProviderError.
class FutureProviderError extends ProviderError {}

@Controller('provider-failure-test')
class ProviderFailureTestController {
  @Get('outbound')
  outbound(): never {
    throw new OutboundHttpStatusError(PROVIDER_URL, 503);
  }

  @Get('parse')
  parse(): never {
    throw new OwidParseError('Unexpected CSV header');
  }

  @Get('data')
  data(): never {
    throw new ProviderDataError('No World entity', { cause: new Error('root cause') });
  }

  @Get('future')
  future(): never {
    throw new FutureProviderError('future provider failed');
  }

  @Get('plain')
  plain(): never {
    throw new Error('boom');
  }

  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException('nope');
  }
}

const PROVIDER_BODY = {
  success: false,
  error: 'Data provider unavailable or returned invalid data',
  status: 502,
};

describe('provider failure contract through the global pipeline', () => {
  let app: INestApplication;
  let loggerErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProviderFailureTestController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    applyGlobalPipeline(app);
    await app.init();
  });

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['outbound', 'parse', 'data', 'future'])(
    'should answer 502 in the error format for the %s provider error',
    async (path) => {
      const response = await supertest(app.getHttpServer()).get(`/provider-failure-test/${path}`);

      expect(response.status).toBe(502);
      expect(response.body).toEqual(PROVIDER_BODY);
    },
  );

  it('should not leak the provider URL or message in the body', async () => {
    const response = await supertest(app.getHttpServer()).get('/provider-failure-test/outbound');

    expect(JSON.stringify(response.body)).not.toContain('provider.example.test');
    expect(JSON.stringify(response.body)).not.toContain('503');
  });

  it('should log the error name, message and cause chain at error level', async () => {
    await supertest(app.getHttpServer()).get('/provider-failure-test/data');

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 502,
        errorName: 'ProviderDataError',
        errorMessage: 'No World entity',
        causes: ['ProviderDataError: No World entity', 'Error: root cause'],
      }),
      expect.any(String),
    );
  });

  it('should keep answering 500 for unexpected errors', async () => {
    const response = await supertest(app.getHttpServer()).get('/provider-failure-test/plain');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Internal server error',
      status: 500,
    });
  });

  it('should keep the HttpException status', async () => {
    const response = await supertest(app.getHttpServer()).get('/provider-failure-test/bad-request');

    expect(response.status).toBe(400);
  });
});
