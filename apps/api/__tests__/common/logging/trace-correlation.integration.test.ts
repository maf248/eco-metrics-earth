import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';

import {
  type CapturedStream,
  closeLoggingApp,
  createLoggingApp,
  settleLogs,
} from './logging-harness';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACE_FIELD = 'logging.googleapis.com/trace';
const SPAN_FIELD = 'logging.googleapis.com/spanId';

describe('Cloud Logging trace correlation', () => {
  let app: INestApplication;
  let captured: CapturedStream;

  beforeAll(async () => {
    ({ app, captured } = await createLoggingApp({ gcpProjectId: 'my-project' }));
  });

  beforeEach(() => {
    captured.clear();
  });

  afterAll(async () => {
    await closeLoggingApp(app);
  });

  it('should put the trace fields and request id on every line of a request with a traceparent', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/ok')
      .set('traceparent', `00-${TRACE_ID}-00f067aa0ba902b7-01`)
      .expect(200);
    await settleLogs();

    const lines = captured.lines();
    // The application line from the controller and the completion line.
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toMatchObject({
        [TRACE_FIELD]: `projects/my-project/traces/${TRACE_ID}`,
        [SPAN_FIELD]: '00f067aa0ba902b7',
        requestId: TRACE_ID,
      });
    }
  });

  it('should use X-Cloud-Trace-Context as the fallback', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/ok')
      .set('X-Cloud-Trace-Context', '105445aa7843bc8bf206b12000100000/1;o=1')
      .expect(200);
    await settleLogs();

    for (const line of captured.lines()) {
      expect(line[TRACE_FIELD]).toBe('projects/my-project/traces/105445aa7843bc8bf206b12000100000');
      expect(line[SPAN_FIELD]).toBe('0000000000000001');
    }
  });

  it('should omit the trace fields for an all-zero trace id and still serve the request', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/ok')
      .set('traceparent', `00-${'0'.repeat(32)}-00f067aa0ba902b7-01`)
      .expect(200);
    await settleLogs();

    const lines = captured.lines();
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toHaveProperty(TRACE_FIELD);
    }
  });
});
