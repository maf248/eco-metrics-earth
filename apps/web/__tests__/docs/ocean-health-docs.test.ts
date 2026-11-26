import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf-8');
}

/** The line of a markdown table or list that starts with the given text. */
function lineStartingWith(text: string, start: string): string {
  const line = text.split('\n').find((candidate) => candidate.startsWith(start));
  expect(line).toBeDefined();
  return line ?? '';
}

describe('ocean health documentation', () => {
  describe('docs/data-sources/ocean-health.md', () => {
    const doc = readRepoFile('docs/data-sources/ocean-health.md');

    it('should list Copernicus Climate Pulse and NOAA LSA as in use', () => {
      expect(doc).toContain('### In use 1. Copernicus Climate Pulse');
      expect(doc).toContain('### In use 3. NOAA Laboratory for Satellite Altimetry');
    });

    it.each([
      'sea-surface-temperature-anomaly',
      'ocean-heat-content-upper',
      'ocean-heat-top-2000m',
      'seawater-ph',
    ])('should list the OWID chart %s as in use', (slug) => {
      expect(doc).toContain(slug);
    });

    it('should note that OWID sea-level stops at 2020-Q4 and coral bleaching at 2016', () => {
      const line = lineStartingWith(doc, '- **OWID `sea-level`**');

      expect(line).toContain('2020-Q4');
      expect(line).toContain('2016');
    });

    it('should mark the FAO fish-stock charts and Sea Around Us as not commercial-safe', () => {
      const line = lineStartingWith(doc, '- **FAO fish-stock charts');

      expect(line).toContain('CC BY-NC-SA');
      expect(line).toContain('Sea Around Us');
      expect(line).toContain('CC BY-NC');
      expect(line).toContain('not commercial-safe');
    });
  });

  describe('ROADMAP.md provider coverage matrix', () => {
    it('should name the three providers used by the ocean-health row', () => {
      const row = lineStartingWith(readRepoFile('ROADMAP.md'), '| ocean-health');

      expect(row).toContain('Copernicus');
      expect(row).toContain('OWID');
      expect(row).toContain('NOAA LSA');
    });
  });

  describe('AGENTS.md', () => {
    const agents = readRepoFile('AGENTS.md');

    it('should list the envelope folder and the ocean-health module in its structure tree', () => {
      expect(agents).toContain('`envelope/`');
      expect(agents).toContain('`ocean-health`');
      expect(agents).toContain('`RowDataTable`');
    });

    it('should cover the Copernicus and NOAA LSA fixture routes in its E2E note', () => {
      const note = lineStartingWith(agents, '**E2E never reaches live providers.**');

      expect(note).toContain('e2e/fixtures/copernicus/');
      expect(note).toContain('e2e/fixtures/noaa-lsa/');
      expect(note).toContain('`/copernicus`');
      expect(note).toContain('`/noaa-lsa`');
    });

    it('should document the sectioned page recipe', () => {
      expect(agents).toContain('**Multi-provider categories use sectioned pages.**');
    });
  });

  describe('README.md', () => {
    const readme = readRepoFile('README.md');

    it('should list the five ocean-health endpoints in the API table', () => {
      for (const section of [
        'sea-surface-temperature',
        'sea-surface-anomaly',
        'ocean-heat-content',
        'sea-level',
        'ocean-ph',
      ]) {
        expect(readme).toContain(`/api/v1/ocean-health/${section}`);
      }
    });
  });
});
