import { test, expect } from '@playwright/test';

import { categoryPage } from './utils/pages';

function assertSecurityHeaders(headers: Record<string, string>) {
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBeTruthy();
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['cross-origin-resource-policy']).toBe('same-origin');
}

test.describe('Security headers on home page', () => {
  test('should return all security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    assertSecurityHeaders(headers);
  });

  test('CSP should include frame-ancestors none', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('CSP should include base-uri self', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("base-uri 'self'");
  });

  test('CSP should include form-action self', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("form-action 'self'");
  });

  test('CSP should include object-src none', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("object-src 'none'");
  });

  test('CSP should include frame-src none', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("frame-src 'none'");
  });

  test('CSP should restrict stylesheets and fonts to self (no Google Fonts)', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).toContain("style-src 'self' 'unsafe-inline';");
    expect(csp).toContain("font-src 'self';");
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');
  });

  test('CSP should not include upgrade-insecure-requests in dev', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'] ?? '';
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  test('Permissions-Policy should restrict camera, microphone, geolocation, payment, usb and midi', async ({
    page,
  }) => {
    const response = await page.goto('/');
    const policy = response?.headers()?.['permissions-policy'] ?? '';
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=()');
    expect(policy).toContain('payment=()');
    expect(policy).toContain('usb=()');
    expect(policy).toContain('midi=()');
  });
});

test.describe('Security headers on category pages', () => {
  test('should return all security headers on category page', async ({ page }) => {
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
