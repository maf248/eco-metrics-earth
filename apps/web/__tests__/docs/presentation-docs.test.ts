import { readFileSync } from 'fs';
import { join } from 'path';

import { DEFAULT_FRESHNESS_THRESHOLDS } from '@/lib/providerFreshness';

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

  describe('design-system.md Color Tokens and degraded states', () => {
    const degradedStates = sectionFrom(designSystem, '### Degraded provider states');
    const globalsCss = readRepoFile('apps/web/src/app/globals.css');

    it.each(['warning-surface', 'warning-line', 'warning-fg'])(
      'should list %s in the Color Tokens table with the values declared in globals.css',
      (token) => {
        const [light, dark] = [
          ...globalsCss.matchAll(
            new RegExp(`--${token}:\\s*oklch\\([^)]*\\);\\s*/\\* ([\\w-]+) \\*/`, 'g'),
          ),
        ].map((match) => match[1]);
        const row = designSystem.split('\n').find((line) => line.startsWith(`| \`${token}\``));

        expect(light).toBeDefined();
        expect(dark).toBeDefined();
        expect(row).toBeDefined();
        expect(row).toContain(light);
        expect(row).toContain(dark);
      },
    );

    const { silentDays, noticeDays } = DEFAULT_FRESHNESS_THRESHOLDS;

    it('should document the stale notice pattern with its copy, role and visibility rule', () => {
      expect(degradedStates).toMatch(/\*\*Stale notice\*\* \(`StaleDataNotice`\)/);
      expect(degradedStates).toContain(
        '{Provider} is currently unreachable. Showing the copy we retrieved on {date}.',
      );
      expect(degradedStates).toContain(`over ${silentDays} and up to ${noticeDays} days`);
      expect(degradedStates).toMatch(/`role="status"`/);
      expect(degradedStates).toMatch(/`formatUtcDate`/);
    });

    it('should document the unavailable state, its header rule and the absence of a retry control', () => {
      expect(degradedStates).toMatch(/\*\*Unavailable state\*\* \(`DataUnavailable`\)/);
      expect(degradedStates).toContain('Data temporarily unavailable');
      expect(degradedStates).toMatch(/the common header .* stays/);
      expect(degradedStates).toMatch(/\*\*no retry button\*\*/);
      expect(degradedStates).toMatch(/Last retrieved from \{Provider\}: \{date\}/);
    });

    it('should state the default thresholds and the per-category override', () => {
      expect(degradedStates).toContain(`\`silentDays: ${silentDays}\``);
      expect(degradedStates).toContain(`\`noticeDays: ${noticeDays}\``);
      expect(degradedStates).toMatch(/`provider\.freshness`/);
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

  describe('design-system.md world map', () => {
    const sequential = sectionFrom(designSystem, '### Sequential (light / dark)');
    const globalsCss = readRepoFile('apps/web/src/app/globals.css');
    const [lightBlock, darkBlock] = [
      globalsCss.slice(globalsCss.indexOf('\n:root {'), globalsCss.indexOf('\n.dark {')),
      globalsCss.slice(globalsCss.indexOf('\n.dark {')),
    ];
    const tokenValue = (block: string, token: string): string | undefined =>
      new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, 'i').exec(block)?.[1];

    it.each([
      'chart-seq-1',
      'chart-seq-2',
      'chart-seq-3',
      'chart-seq-4',
      'chart-seq-5',
      'chart-no-data',
    ])('should list %s with the light and dark values declared in globals.css', (token) => {
      const row = sequential.split('\n').find((line) => line.startsWith(`| \`${token}\``));

      expect(row).toBeDefined();
      expect(row).toContain(tokenValue(lightBlock, token));
      expect(row).toContain(tokenValue(darkBlock, token));
    });

    it('should record the ramp validation and its exceptions, and nothing pending', () => {
      expect(sequential).toMatch(/Yellow → red/);
      expect(sequential).toMatch(/1\.90:1/);
      expect(sequential).toMatch(/Hue spread/);
      expect(sequential).not.toMatch(/pending/i);
    });

    it('should leave nothing about map geometry pending in the Presentation Stack', () => {
      const geometry = presentationStack
        .split('\n')
        .find((line) => line.startsWith('- **Map geometry:**'));

      expect(geometry).toBeDefined();
      expect(geometry).not.toMatch(/pending/i);
    });

    it('should state that the map box takes the map aspect because ECharts stretches it', () => {
      const rule9 = designSystem.split('\n').find((line) => line.startsWith('9. **Maps:**'));

      expect(rule9).toMatch(/stretches a map/);
      expect(rule9).toMatch(/aspect-\[2238\/1000\]/);
      expect(rule9).toMatch(/npm run geo:world/);
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
