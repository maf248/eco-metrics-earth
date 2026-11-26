import { readFileSync } from 'fs';
import { join } from 'path';

const API_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(API_ROOT, '..', '..');

/** The four variables of the Copernicus Climate Pulse and NOAA LSA clients, with their defaults. */
const DOCUMENTED_VARIABLES = [
  ['COPERNICUS_CLIMATE_PULSE_BASE_URL', 'https://sites.ecmwf.int/data/climatepulse/data/series'],
  ['COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS', '21600'],
  ['NOAA_LSA_BASE_URL', 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr'],
  ['NOAA_LSA_CACHE_TTL_SECONDS', '604800'],
] as const;

const DOCUMENTS = {
  'apps/api/.env.example': join(API_ROOT, '.env.example'),
  'apps/api/README.md': join(API_ROOT, 'README.md'),
  'README.md': join(REPO_ROOT, 'README.md'),
} as const;

describe('documentation of the ocean health provider variables', () => {
  it.each(Object.keys(DOCUMENTS) as (keyof typeof DOCUMENTS)[])(
    'should document every variable with its default in %s',
    (document) => {
      const text = readFileSync(DOCUMENTS[document], 'utf-8');

      for (const [name, defaultValue] of DOCUMENTED_VARIABLES) {
        expect(text).toContain(name);
        expect(text).toContain(defaultValue);
      }
    },
  );
});
