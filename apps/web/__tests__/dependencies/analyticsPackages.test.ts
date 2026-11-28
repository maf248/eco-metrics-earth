import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE_ROOT = join(__dirname, '../../../..');
const ANALYTICS_PACKAGES = ['@vercel/analytics', '@vercel/speed-insights'];

function readDependencies(manifestPath: string): Record<string, string> {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return { ...manifest.dependencies, ...manifest.devDependencies };
}

describe('Vercel analytics packages', () => {
  const webDependencies = readDependencies(join(WORKSPACE_ROOT, 'apps/web/package.json'));

  it.each(ANALYTICS_PACKAGES)('should pin %s to an exact version in apps/web', (name) => {
    expect(webDependencies[name]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it.each([join(WORKSPACE_ROOT, 'package.json'), join(WORKSPACE_ROOT, 'apps/api/package.json')])(
    'should not add the analytics packages to %s',
    (manifestPath) => {
      const dependencies = readDependencies(manifestPath);
      for (const name of ANALYTICS_PACKAGES) {
        expect(dependencies).not.toHaveProperty([name]);
      }
    },
  );
});
