import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';

import { E2E_INTERNAL_API_KEY, apiHeaders } from './utils/api-env.ts';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';
// Required properties of the throttled route: read-only, side-effect-free, governed by the
// global throttlers with no per-route override. Change the route here only.
const THROTTLED_URL = `${API_BASE_URL}/water-footprint/products`;
const HEALTH_URL = `${API_BASE_URL}/health`;
const ANONYMOUS_LIMIT = 30;
const KEYED_LIMIT = 300;

// RFC 5737 documentation ranges: never routable, so safe as synthetic client addresses.
const DOCUMENTATION_PREFIXES = ['192.0.2', '198.51.100', '203.0.113'];
const usedIps = new Set<string>();

/** Returns a documentation-range IP not used earlier in this worker, so no two tests share a bucket. */
function uniqueIp(): string {
  for (;;) {
    const prefix =
      DOCUMENTATION_PREFIXES[Math.floor(Math.random() * DOCUMENTATION_PREFIXES.length)];
    const ip = `${prefix}.${1 + Math.floor(Math.random() * 254)}`;
    if (!usedIps.has(ip)) {
      usedIps.add(ip);
      return ip;
    }
  }
}

async function sendRequests(
  request: APIRequestContext,
  count: number,
  headers: Record<string, string>,
): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const response = await request.get(THROTTLED_URL, { headers });
    statuses.push(response.status());
  }
  return statuses;
}

// Not tagged @smoke on purpose: the non-desktop projects only run @smoke tests, so this spec
// runs in `chromium-desktop` only and 300+ request bursts are not multiplied across projects.
test.describe('API access control and rate limiting', () => {
  test.beforeAll(async () => {
    const context = await playwrightRequest.newContext();
    const misconfigured =
      'The API on :3001 was probably started without the E2E throttling env. Stop the running ' +
      'API so the E2E wrapper can spawn it, or restart it with TRUST_PROXY_HOPS=1 and ' +
      `INTERNAL_API_KEY=${E2E_INTERNAL_API_KEY}.`;
    try {
      const first = await context.get(THROTTLED_URL, {
        headers: apiHeaders({ 'X-Forwarded-For': uniqueIp() }),
      });
      const second = await context.get(THROTTLED_URL, {
        headers: apiHeaders({ 'X-Forwarded-For': uniqueIp() }),
      });

      if (first.status() === 401 || second.status() === 401) {
        throw new Error(`The API does not accept the E2E internal key. ${misconfigured}`);
      }

      const firstRemaining = first.headers()['x-ratelimit-remaining'];
      const secondRemaining = second.headers()['x-ratelimit-remaining'];

      if (firstRemaining === undefined || firstRemaining !== secondRemaining) {
        throw new Error(
          'The API does not identify clients by X-Forwarded-For (distinct clients share one ' +
            `rate-limit counter). ${misconfigured}`,
        );
      }
    } finally {
      await context.dispose();
    }
  });

  test('should answer 401 without a key and 429 after the anonymous limit', async ({ request }) => {
    const clientA = uniqueIp();
    const clientB = uniqueIp();

    const statuses = await sendRequests(request, ANONYMOUS_LIMIT + 1, {
      'X-Forwarded-For': clientA,
    });

    expect(statuses.slice(0, ANONYMOUS_LIMIT).every((status) => status === 401)).toBe(true);
    expect(statuses[ANONYMOUS_LIMIT]).toBe(429);

    // A different client has its own, untouched bucket.
    const other = await request.get(THROTTLED_URL, { headers: { 'X-Forwarded-For': clientB } });
    expect(other.status()).toBe(401);
  });

  test('should not let a forged leftmost X-Forwarded-For entry evade the limit', async ({
    request,
  }) => {
    const client = uniqueIp();
    await sendRequests(request, ANONYMOUS_LIMIT, { 'X-Forwarded-For': client });

    for (let i = 0; i < 5; i += 1) {
      const forged = `198.18.${i}.${1 + i}`;
      const response = await request.get(THROTTLED_URL, {
        headers: { 'X-Forwarded-For': `${forged}, ${client}` },
      });
      expect(response.status()).toBe(429);
    }

    // Control: the same forged entry with a fresh rightmost client is not limited yet, so the
    // 429s above come from keying on the rightmost entry, not from a shared (loopback) bucket.
    const control = await request.get(THROTTLED_URL, {
      headers: { 'X-Forwarded-For': `198.18.0.1, ${uniqueIp()}` },
    });
    expect(control.status()).toBe(401);
  });

  test('should answer 401 for a missing key and for a wrong key', async ({ request }) => {
    const missing = await request.get(THROTTLED_URL, {
      headers: { 'X-Forwarded-For': uniqueIp() },
    });
    const wrong = await request.get(THROTTLED_URL, {
      headers: { 'X-Forwarded-For': uniqueIp(), 'X-Internal-Api-Key': 'wrong-key' },
    });

    expect(missing.status()).toBe(401);
    expect(wrong.status()).toBe(401);
  });

  test('should answer 429 after the keyed limit', async ({ request }) => {
    const statuses = await sendRequests(
      request,
      KEYED_LIMIT + 1,
      apiHeaders({ 'X-Forwarded-For': uniqueIp() }),
    );

    expect(statuses.slice(0, KEYED_LIMIT).every((status) => status === 200)).toBe(true);
    expect(statuses[KEYED_LIMIT]).toBe(429);
  });

  test('should keep the health endpoint open without a key after the limit is exhausted', async ({
    request,
  }) => {
    const headers = { 'X-Forwarded-For': uniqueIp() };
    const statuses = await sendRequests(request, ANONYMOUS_LIMIT + 1, headers);
    expect(statuses[ANONYMOUS_LIMIT]).toBe(429);

    const health = await request.get(HEALTH_URL, { headers });
    expect(health.status()).toBe(200);
  });
});
