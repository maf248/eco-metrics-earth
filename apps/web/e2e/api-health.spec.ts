import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';

test.describe('API health endpoint', () => {
  test('should return 200 with status ok', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('should return CORS headers on health response', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  test('should omit CORS headers for an unknown origin on health response', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('should omit CORS headers when no Origin header is sent', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });
});

test.describe('API error handling', () => {
  test('should return 404 for nonexistent route', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nonexistent`);
    expect(response.status()).toBe(404);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/json/);
  });

  test('should return CORS headers on error responses', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nonexistent`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

test.describe('API water-footprint — error format', () => {
  const PRODUCTS_URL = `${API_BASE_URL}/water-footprint/products`;

  test('should return 400 in the ApiResponse error format for an invalid category', async ({
    request,
  }) => {
    const response = await request.get(`${PRODUCTS_URL}?category=invalid`);
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(body.status).toBe(400);
  });

  test('should return 200 with success true for a valid request', async ({ request }) => {
    const response = await request.get(PRODUCTS_URL);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('should return CORS headers on the 400 response', async ({ request }) => {
    const response = await request.get(`${PRODUCTS_URL}?category=invalid`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.status()).toBe(400);
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
