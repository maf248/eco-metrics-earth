import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';

import {
  type CapturedStream,
  closeLoggingApp,
  createLoggingApp,
  settleLogs,
} from './logging-harness';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('X-Request-ID through the pino logger', () => {
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

  it('should echo the request id on a 5xx and use the same id as requestId in the error entry', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/api/v1/boom')
      .set('X-Request-ID', 'web-1234.abcd_EF')
      .expect(500);
    await settleLogs();

    expect(response.headers['x-request-id']).toBe('web-1234.abcd_EF');
    const [error] = captured.lines().filter((line) => line.severity === 'ERROR');
    expect(error).toMatchObject({ requestId: 'web-1234.abcd_EF', status: 500 });
  });

  it('should carry a generated request id on a 5xx when nothing is sent', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/boom').expect(500);
    await settleLogs();

    expect(response.headers['x-request-id']).toMatch(UUID_V4);
    const [error] = captured.lines().filter((line) => line.severity === 'ERROR');
    expect(error).toMatchObject({ requestId: response.headers['x-request-id'] });
  });

  it('should log a safe incoming request id on every line of the request', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/ok')
      .set('X-Request-ID', 'web-1234.abcd_EF')
      .expect(200);
    await settleLogs();

    const lines = captured.lines();
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line).toHaveProperty('requestId', 'web-1234.abcd_EF');
    }
  });

  it.each([
    ['too short', 'short'],
    ['too long', 'a'.repeat(65)],
    ['containing a space', 'has a space in it'],
    ['non-ASCII', 'abcdefghé-marker'],
    ['repeated', ['abcdefgh-marker', 'ijklmnop']],
  ])(
    'should replace an unsafe X-Request-ID that is %s and keep it out of the logs',
    async (_label, value) => {
      const response = await supertest(app.getHttpServer())
        .get('/api/v1/ok')
        // superagent sends an array as a repeated header; its typings allow arrays only for Cookie.
        .set('X-Request-ID', value as string)
        .expect(200);
      await settleLogs();

      expect(response.headers['x-request-id']).toMatch(UUID_V4);
      const marker = Array.isArray(value) ? value.join(', ') : value;
      expect(JSON.stringify(response.headers)).not.toContain('marker');
      expect(captured.text()).not.toContain('marker');
      expect(captured.text()).not.toContain(marker);
      const lines = captured.lines();
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const line of lines) {
        expect(line).toHaveProperty('requestId', response.headers['x-request-id']);
      }
    },
  );
});
