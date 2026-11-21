import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { E2E_API_SENTRY_ENV, E2E_WEB_SENTRY_ENV } from '../../e2e/utils/api-env';

describe('E2E Sentry isolation', () => {
  it('should set an empty DSN for the API process', () => {
    expect(E2E_API_SENTRY_ENV).toEqual({ SENTRY_DSN: '' });
  });

  it('should set an empty DSN for the web process', () => {
    expect(E2E_WEB_SENTRY_ENV).toEqual({ NEXT_PUBLIC_SENTRY_DSN: '' });
  });

  it('should pass both to the spawned servers in the wrapper', () => {
    const source = readFileSync(join(__dirname, '../../e2e/run-dev-servers.ts'), 'utf8');
    expect(source).toContain('...E2E_API_SENTRY_ENV');
    expect(source).toContain('...E2E_WEB_SENTRY_ENV');
  });

  it('should clear a local DSN in the Jest setup', () => {
    expect(process.env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
  });
});
