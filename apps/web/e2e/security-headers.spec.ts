import { test, expect } from '@playwright/test';

import { categoryPage } from './utils/pages';

function assertSecurityHeaders(headers: Record<string, string>) {
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBeTruthy();
  expect(headers['content-security-policy']).toBeTruthy();
}

test.describe('Security headers on home page', { tag: '@smoke' }, () => {
  test('should return all 5 security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    assertSecurityHeaders(headers);
  });

  test('CSP should include frame-ancestors none', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('Permissions-Policy should restrict camera, microphone, geolocation', async ({ page }) => {
    const response = await page.goto('/');
    const policy = response?.headers()?.['permissions-policy'] ?? '';
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=()');
  });
});

test.describe('Security headers on category pages', () => {
  test('should return all 5 security headers on category page', async ({ page }) => {
    const cp = categoryPage('air-quality');
    const response = await page.goto(cp.url);
    const headers = response?.headers() ?? {};
    assertSecurityHeaders(headers);
  });
});

test.describe('Security headers on 404 page', () => {
  test('should return security headers on 404 page', async ({ page }) => {
    const response = await page.goto('/nonexistent/');
    const headers = response?.headers() ?? {};
    assertSecurityHeaders(headers);
  });
});
