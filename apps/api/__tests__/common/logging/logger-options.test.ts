import type { INestApplication } from '@nestjs/common';
import pino from 'pino';
import supertest from 'supertest';

import { buildLoggerParams } from '../../../src/common/logging/logger-options';
import { REDACT_PATHS } from '../../../src/common/logging/redact-paths';

import {
  type CapturedStream,
  closeLoggingApp,
  createCapturedStream,
  createLoggingApp,
  settleLogs,
} from './logging-harness';

const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

function pinoHttpOptions(config: Parameters<typeof buildLoggerParams>[0]) {
  const params = buildLoggerParams(config);
  if (!params.pinoHttp || Array.isArray(params.pinoHttp) || !('level' in params.pinoHttp)) {
    throw new Error('expected an options object');
  }
  return params.pinoHttp as Record<string, unknown>;
}

describe('buildLoggerParams options', () => {
  it.each(['production', 'test'])(
    'should use the severity formatter and no transport for NODE_ENV=%s',
    (nodeEnv) => {
      const options = pinoHttpOptions({ logLevel: 'info', nodeEnv, gcpProjectId: undefined });

      expect(options.transport).toBeUndefined();
      expect(options.formatters).toEqual({ level: expect.any(Function) });
    },
  );

  it('should use the pino-pretty transport and no formatter for NODE_ENV=development', () => {
    const options = pinoHttpOptions({
      logLevel: 'debug',
      nodeEnv: 'development',
      gcpProjectId: undefined,
    });

    expect(options.transport).toMatchObject({ target: 'pino-pretty' });
    expect(options.formatters).toBeUndefined();
  });

  it('should pass the destination as the second element of the pino-http tuple', () => {
    const { stream } = createCapturedStream();
    const params = buildLoggerParams(
      { logLevel: 'info', nodeEnv: 'production', gcpProjectId: undefined },
      stream,
    );

    expect(params.pinoHttp).toEqual([expect.any(Object), stream]);
  });
});

describe('structured output', () => {
  it('should write severity, message and an ISO time, and omit level, pid and hostname', () => {
    const captured = createCapturedStream();
    const [options] = buildLoggerParams(
      { logLevel: 'info', nodeEnv: 'production', gcpProjectId: undefined },
      captured.stream,
    ).pinoHttp as [pino.LoggerOptions, unknown];
    const logger = pino(options, captured.stream);

    logger.info('hello');

    const [line] = captured.lines();
    expect(line).toMatchObject({ severity: 'INFO', message: 'hello' });
    expect(new Date(line.time as string).toISOString()).toBe(line.time);
    expect(line).not.toHaveProperty('level');
    expect(line).not.toHaveProperty('pid');
    expect(line).not.toHaveProperty('hostname');
  });

  it('should censor the listed secret headers when an object with req.headers is logged', () => {
    const captured = createCapturedStream();
    const [options] = buildLoggerParams(
      { logLevel: 'info', nodeEnv: 'production', gcpProjectId: undefined },
      captured.stream,
    ).pinoHttp as [pino.LoggerOptions, unknown];
    const logger = pino({ ...options, serializers: {} }, captured.stream);

    logger.info(
      {
        req: {
          headers: {
            authorization: 'Bearer marker-auth',
            cookie: 'sid=marker-cookie',
            'x-api-key': 'marker-api-key',
            'x-internal-api-key': 'marker-internal',
            accept: 'application/json',
          },
        },
        res: { headers: { 'set-cookie': 'sid=marker-set-cookie' } },
      },
      'with headers',
    );

    const [line] = captured.lines();
    const text = captured.text();
    for (const marker of ['marker-auth', 'marker-cookie', 'marker-api-key', 'marker-internal']) {
      expect(text).not.toContain(marker);
    }
    expect(text).not.toContain('marker-set-cookie');
    expect(line.req).toEqual({
      headers: {
        authorization: '[Redacted]',
        cookie: '[Redacted]',
        'x-api-key': '[Redacted]',
        'x-internal-api-key': '[Redacted]',
        accept: 'application/json',
      },
    });
    expect(REDACT_PATHS).toHaveLength(5);
  });
});

describe('request logging through the app', () => {
  let app: INestApplication;
  let captured: CapturedStream;

  beforeAll(async () => {
    ({ app, captured } = await createLoggingApp());
  });

  beforeEach(() => {
    captured.clear();
  });

  afterAll(async () => {
    await closeLoggingApp(app);
  });

  function completionLines() {
    return captured.lines().filter((line) => line.res !== undefined);
  }

  it('should route existing Nest Logger call sites through pino as one JSON line', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/ok').expect(200);
    await settleLogs();

    const appLines = captured.lines().filter((line) => line.context === 'X');
    expect(appLines).toHaveLength(1);
    expect(appLines[0]).toMatchObject({ severity: 'WARNING', message: 'message', context: 'X' });
  });

  it('should not log the startup probe, with or without a query string', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/health').expect(200);
    await supertest(app.getHttpServer()).get('/api/v1/health?probe=1').expect(200);
    await supertest(app.getHttpServer()).get('/api/v1/health/').expect(200);
    await settleLogs();

    expect(captured.lines()).toEqual([]);
  });

  it('should treat the probe path case-insensitively, as Express routing does', async () => {
    await supertest(app.getHttpServer()).get('/API/V1/HEALTH').expect(200);
    await settleLogs();

    expect(captured.lines()).toEqual([]);
  });

  it('should log the dependencies health route', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/health/dependencies').expect(200);
    await settleLogs();

    expect(completionLines()).toHaveLength(1);
  });

  it('should log INFO for 200 and WARNING for 404', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/ok').expect(200);
    await supertest(app.getHttpServer()).get('/api/v1/missing').expect(404);
    await settleLogs();

    const lines = completionLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ severity: 'INFO', res: { statusCode: 200 } });
    expect(lines[1]).toMatchObject({ severity: 'WARNING', res: { statusCode: 404 } });
  });

  it('should produce no pino-http completion line for a 500', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/boom').expect(500);
    await settleLogs();

    expect(completionLines()).toEqual([]);
  });

  it('should log only method, url and status for a request, never headers', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/ok?category=food')
      .set('Authorization', 'Bearer marker-auth')
      .set('Cookie', 'sid=marker-cookie')
      .set('X-Api-Key', 'marker-api-key')
      .set('X-Internal-Api-Key', 'marker-internal')
      .expect(200);
    await settleLogs();

    const text = captured.text();
    for (const marker of ['marker-auth', 'marker-cookie', 'marker-api-key', 'marker-internal']) {
      expect(text).not.toContain(marker);
    }
    const [completion] = completionLines();
    expect(completion.req).toEqual({ method: 'GET', url: '/api/v1/ok?category=food' });
    expect(completion).not.toHaveProperty('headers');
    expect(text).not.toContain('"headers"');
  });

  it('should not log request body content', async () => {
    await supertest(app.getHttpServer())
      .post('/api/v1/echo')
      .send({ secret: 'marker-body-content' })
      .expect(201);
    await settleLogs();

    expect(completionLines()).toHaveLength(1);
    expect(captured.text()).not.toContain('marker-body-content');
  });

  it('should bind the request id and omit the trace fields when no project id is set', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/ok')
      .set('traceparent', TRACEPARENT)
      .expect(200);
    await settleLogs();

    const lines = captured.lines();
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line).toHaveProperty('requestId', '4bf92f3577b34da6a3ce929d0e0e4736');
      expect(line).not.toHaveProperty('logging.googleapis.com/trace');
      expect(line).not.toHaveProperty('logging.googleapis.com/spanId');
    }
  });
});
