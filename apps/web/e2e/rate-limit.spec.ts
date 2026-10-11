import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';

import { E2E_INTERNAL_API_KEY } from './utils/api-env.ts';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';
// Required properties of the throttled route: read-only, side-effect-free, governed by the
// global default throttle with no per-route override. Change the route here only.
const THROTTLED_URL = `${API_BASE_URL}/water-footprint/products`;
const HEALTH_URL = `${API_BASE_URL}/health`;
const LIMIT = 60;

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
// runs in `chromium-desktop` only and 60+ request bursts are not multiplied across projects.
test.describe('API rate limiting', () => {
  test.beforeAll(async () => {
    const context = await playwrightRequest.newContext();
    try {
      const first = await context.get(THROTTLED_URL, {
        headers: { 'X-Forwarded-For': uniqueIp() },
      });
      const second = await context.get(THROTTLED_URL, {
        headers: { 'X-Forwarded-For': uniqueIp() },
      });
      const firstRemaining = first.headers()['x-ratelimit-remaining'];
      const secondRemaining = second.headers()['x-ratelimit-remaining'];

      if (firstRemaining === undefined || firstRemaining !== secondRemaining) {
        throw new Error(
          'The API on :3001 does not identify clients by X-Forwarded-For (distinct clients share ' +
            'one rate-limit counter). It was probably started without the E2E throttling env. ' +
            'Stop the running API so the E2E wrapper can spawn it, or restart it with ' +
            `TRUST_PROXY_HOPS=1 and INTERNAL_API_KEY=${E2E_INTERNAL_API_KEY}.`,
        );
      }
    } finally {
      await context.dispose();
    }
  });

  test('should limit different X-Forwarded-For clients independently', async ({ request }) => {
    const clientA = uniqueIp();
    const clientB = uniqueIp();

    const statuses = await sendRequests(request, LIMIT + 1, { 'X-Forwarded-For': clientA });

    expect(statuses.slice(0, LIMIT).every((status) => status === 200)).toBe(true);
    expect(statuses[LIMIT]).toBe(429);

    const other = await request.get(THROTTLED_URL, { headers: { 'X-Forwarded-For': clientB } });
    expect(other.status()).toBe(200);
  });

  test('should not let a forged leftmost X-Forwarded-For entry evade the limit', async ({
    request,
  }) => {
    const client = uniqueIp();
    await sendRequests(request, LIMIT, { 'X-Forwarded-For': client });

    for (let i = 0; i < 5; i += 1) {
      const forged = `198.18.${i}.${1 + i}`;
      const response = await request.get(THROTTLED_URL, {
        headers: { 'X-Forwarded-For': `${forged}, ${client}` },
      });
      expect(response.status()).toBe(429);
    }
  });

  test('should bypass the limit with the valid internal API key', async ({ request }) => {
    const statuses = await sendRequests(request, LIMIT + 10, {
      'X-Forwarded-For': uniqueIp(),
      'X-Internal-Api-Key': E2E_INTERNAL_API_KEY,
    });

    expect(statuses.filter((status) => status === 429)).toEqual([]);
  });

  test('should throttle requests carrying a wrong internal API key', async ({ request }) => {
    const statuses = await sendRequests(request, LIMIT + 1, {
      'X-Forwarded-For': uniqueIp(),
      'X-Internal-Api-Key': 'wrong-key',
    });

    expect(statuses[LIMIT]).toBe(429);
  });

  test('should throttle requests without an internal API key', async ({ request }) => {
    const statuses = await sendRequests(request, LIMIT + 1, { 'X-Forwarded-For': uniqueIp() });

    expect(statuses[LIMIT]).toBe(429);
  });

  test('should keep the health endpoint exempt after the limit is exhausted', async ({
    request,
  }) => {
    const headers = { 'X-Forwarded-For': uniqueIp() };
    const statuses = await sendRequests(request, LIMIT + 1, headers);
    expect(statuses[LIMIT]).toBe(429);

    const health = await request.get(HEALTH_URL, { headers });
    expect(health.status()).toBe(200);
  });
});
