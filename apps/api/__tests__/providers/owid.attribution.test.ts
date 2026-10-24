import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return collectSourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });

describe('OWID_PUBLISHER', () => {
  it('should define Our World in Data name, license and URL', () => {
    expect(OWID_PUBLISHER).toEqual({
      provider: 'Our World in Data',
      license: 'CC BY 4.0',
      sourceUrl: 'https://ourworldindata.org',
    });
  });

  it('should be the only place in the API and web sources that spells out the license', () => {
    const repoRoot = join(__dirname, '..', '..', '..', '..');
    const files = [
      ...collectSourceFiles(join(repoRoot, 'apps', 'api', 'src')),
      ...collectSourceFiles(join(repoRoot, 'apps', 'web', 'src')),
    ];

    const matches = files
      .filter((file) => readFileSync(file, 'utf-8').includes('CC BY 4.0'))
      .map((file) => file.slice(repoRoot.length + 1));

    expect(matches).toEqual([join('apps', 'api', 'src', 'common', 'publishers', 'publishers.ts')]);
  });
});
