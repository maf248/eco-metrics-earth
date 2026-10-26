import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf-8');
}

function sectionFrom(text: string, heading: string): string {
  const start = text.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + heading.length);
  const next = rest.search(/\n#{1,3} /);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('presentation docs', () => {
  const designSystem = readRepoFile('docs/design-system.md');
  const libraries = readRepoFile('docs/technical/libraries.md');
  const presentationStack = sectionFrom(designSystem, '## Presentation Stack');

  describe('design-system.md Presentation Stack', () => {
    it('should document signed anomalies with the real minus sign U+2212', () => {
      expect(presentationStack).toMatch(/Anomalies are signed/);
      expect(presentationStack).toMatch(/U\+2212/);
    });

    it('should document the labelled reference line at zero in theme colors', () => {
      expect(presentationStack).toMatch(/draws a labelled reference line at zero/);
      expect(presentationStack).toMatch(/markLine/);
    });

    it('should document that a single-measure chart has no toggle', () => {
      expect(presentationStack).toMatch(/A single-measure chart has no toggle/);
    });

    it('should document the upstream credit line next to the data attribution', () => {
      expect(presentationStack).toMatch(/upstream credit line/);
    });

    it('should document the confidence band technique', () => {
      expect(presentationStack).toMatch(/Confidence band/);
      expect(presentationStack).toMatch(/invisible base/);
    });

    it('should document labelled threshold lines for references such as 1.5 °C', () => {
      expect(presentationStack).toMatch(/1\.5 °C/);
      expect(presentationStack).toMatch(/labelled reference line/);
    });

    it('should document the lazy below-the-fold rule implemented by RenderWhenVisible', () => {
      expect(presentationStack).toMatch(/RenderWhenVisible/);
    });

    it('should document each origin credited next to the chart it feeds through OriginCredit', () => {
      expect(presentationStack).toMatch(/OriginCredit/);
    });
  });

  describe('design-system.md Color Palettes', () => {
    it('should keep the divergent palette marked pending', () => {
      const divergent = sectionFrom(designSystem, '### Divergent (light / dark)');

      expect(divergent).toMatch(/^\s*Pending/m);
    });

    it('should declare no divergent token in globals.css', () => {
      expect(readRepoFile('apps/web/src/app/globals.css')).not.toMatch(/--[\w-]*diverg/i);
    });
  });

  describe('design-system.md chart rules', () => {
    it('should name the mark line among the modules registered where they are used', () => {
      const rule3 = designSystem
        .split('\n')
        .find((line) => line.startsWith('3. **Register modules'));

      expect(rule3).toBeDefined();
      expect(rule3).toMatch(/mark line/);
    });
  });

  describe('libraries.md', () => {
    it('should record the measured gzipped size added by the mark line component', () => {
      const markLineCost = sectionFrom(libraries, '### Reference line (mark line) cost');

      expect(markLineCost).toMatch(/gzip/);
      expect(markLineCost).toMatch(/\d+(\.\d+)?\s*KB/);
    });
  });
});
