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

const PUBLISHERS_FILE = join('apps', 'api', 'src', 'common', 'publishers', 'publishers.ts');
// Upstream origins name their own licenses (the producer's CC BY 4.0); these are the only
// other files allowed to spell it out.
const ORIGIN_DECLARATIONS = [
  join('apps', 'api', 'src', 'modules', 'co2-emissions', 'co2-emissions.constants.ts'),
  join('apps', 'api', 'src', 'modules', 'energy-sources', 'energy-sources.constants.ts'),
  join('apps', 'api', 'src', 'modules', 'global-temperature', 'global-temperature.constants.ts'),
];

describe('OWID_PUBLISHER', () => {
  it('should define Our World in Data name, license and URL', () => {
    expect(OWID_PUBLISHER).toEqual({
      provider: 'Our World in Data',
      license: 'CC BY 4.0',
      sourceUrl: 'https://ourworldindata.org',
    });
  });

  it('should be spelled out only in publishers.ts and the declared origin files', () => {
    const repoRoot = join(__dirname, '..', '..', '..', '..');
    const files = [
      ...collectSourceFiles(join(repoRoot, 'apps', 'api', 'src')),
      ...collectSourceFiles(join(repoRoot, 'apps', 'web', 'src')),
    ];

    const matches = files
      .filter((file) => readFileSync(file, 'utf-8').includes('CC BY 4.0'))
      .map((file) => file.slice(repoRoot.length + 1))
      .sort();

    expect(matches).toEqual([PUBLISHERS_FILE, ...ORIGIN_DECLARATIONS].sort());
  });

  it('should not repeat the OWID name in the origin declaration files', () => {
    const repoRoot = join(__dirname, '..', '..', '..', '..');

    for (const file of ORIGIN_DECLARATIONS) {
      expect(readFileSync(join(repoRoot, file), 'utf-8')).not.toContain('Our World in Data');
    }
  });
});
