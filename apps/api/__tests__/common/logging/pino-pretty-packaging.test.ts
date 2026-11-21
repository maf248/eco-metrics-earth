import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const API_ROOT = join(__dirname, '..', '..', '..');
const SRC_ROOT = join(API_ROOT, 'src');

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }
    return extname(path) === '.ts' ? [path] : [];
  });
}

describe('pino-pretty packaging', () => {
  const manifest = JSON.parse(
    readFileSync(join(API_ROOT, 'package.json'), 'utf-8'),
  ) as PackageManifest;

  it('should declare pino-pretty as a devDependency only', () => {
    expect(manifest.devDependencies).toHaveProperty('pino-pretty');
    expect(manifest.dependencies ?? {}).not.toHaveProperty('pino-pretty');
  });

  it('should keep the runtime logging packages in production dependencies', () => {
    expect(manifest.dependencies).toEqual(
      expect.objectContaining({ 'nestjs-pino': expect.any(String) }),
    );
    expect(manifest.dependencies).toEqual(expect.objectContaining({ pino: expect.any(String) }));
    expect(manifest.dependencies).toEqual(
      expect.objectContaining({ 'pino-http': expect.any(String) }),
    );
  });

  it('should never import pino-pretty statically from the sources', () => {
    const offenders = listSourceFiles(SRC_ROOT).filter((file) =>
      /(?:from|require\(|import\()\s*['"]pino-pretty['"]/.test(readFileSync(file, 'utf-8')),
    );

    expect(offenders).toEqual([]);
  });
});
