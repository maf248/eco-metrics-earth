import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';

test.describe('API health endpoint', { tag: '@smoke' }, () => {
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

test.describe('API error handling', { tag: '@smoke' }, () => {
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

test.describe('API demo-validation — GET', { tag: '@smoke' }, () => {
  test('should return 200 and echo query params', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/demo-validation`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('query');
    expect(body.query).toEqual({});
  });

  test('should echo optional query params when provided', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/demo-validation?category=air-quality`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.query).toHaveProperty('category', 'air-quality');
  });

  test('should return CORS headers on GET demo', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/demo-validation`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

test.describe('API demo-validation — POST', { tag: '@smoke' }, () => {
  test('should return 201 and echo valid body', async ({ request }) => {
    const payload = { name: 'CO2 PPM', value: 415, unit: 'ppm' };
    const response = await request.post(`${API_BASE_URL}/demo-validation`, {
      data: payload,
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.body).toEqual(payload);
  });

  test('should return 400 for invalid body (missing required fields)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/demo-validation`, {
      data: { name: 'Incomplete' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return CORS headers on POST demo', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/demo-validation`, {
      data: { name: 'Test', value: 1, unit: 'test' },
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
