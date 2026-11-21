import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';

import {
  type CapturedStream,
  closeLoggingApp,
  createLoggingApp,
  settleLogs,
} from '../logging/logging-harness';

describe('AllExceptionsFilter logging through the pino logger', () => {
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

  it('should log an unexpected error once, with its stack in message', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/boom').expect(500);
    await settleLogs();

    const errors = captured.lines().filter((line) => line.severity === 'ERROR');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      status: 500,
      method: 'GET',
      path: '/api/v1/boom',
      context: 'AllExceptionsFilter',
      requestId: response.headers['x-request-id'],
    });
    expect(errors[0].message).toEqual(expect.stringContaining('Error: boom'));
    expect(errors[0].message).toEqual(expect.stringContaining('at '));
    // pino-http adds no second entry for the 5xx.
    expect(captured.lines()).toHaveLength(1);
  });

  it('should not log a client error in the filter and write one WARNING completion line', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/bad-request').expect(400);
    await settleLogs();

    const lines = captured.lines();
    expect(lines.filter((line) => line.severity === 'ERROR')).toEqual([]);
    expect(lines.filter((line) => line.context === 'AllExceptionsFilter')).toEqual([]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ severity: 'WARNING', res: { statusCode: 400 } });
  });

  it('should still log a non-empty message when a string is thrown', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/string-thrown').expect(500);
    await settleLogs();

    const errors = captured.lines().filter((line) => line.severity === 'ERROR');
    expect(errors).toHaveLength(1);
    expect(typeof errors[0].message).toBe('string');
    expect((errors[0].message as string).length).toBeGreaterThan(0);
  });
});
