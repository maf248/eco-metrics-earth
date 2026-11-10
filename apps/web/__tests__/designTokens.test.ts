/**
 * @jest-environment node
 */

/**
 * Guards the semantic color token system (docs/design-system.md, "Color tokens"):
 * pages and components take every color from a token in `globals.css`, never from
 * Tailwind's palette, and every token declared there is actually used.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  CHART_COLOR_TOKENS,
  CHART_ENERGY_TOKENS,
  CHART_NO_DATA_TOKEN,
  CHART_SEQUENTIAL_TOKENS,
} from '../src/components/charts/chartTokens';

const SRC_DIR = path.resolve(__dirname, '../src');
const GLOBALS_CSS = path.join(SRC_DIR, 'app/globals.css');
const SCANNED_DIRS = ['app', 'components'].map((dir) => path.join(SRC_DIR, dir));

/**
 * Documented exceptions (docs/design-system.md): palette or arbitrary colors that
 * are intentionally not tokens. Keyed by path relative to `src/`.
 */
const ALLOWED_COLOR_CLASSES: Record<string, string[]> = {
  // Lit/unlit lamp state indicator — defined in terms of `dark:` variants by the theme-toggle spec.
  'components/ThemeToggle.tsx': [
    'text-amber-400',
    'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    'dark:text-gray-400',
  ],
};

const COLOR_UTILITY =
  '(?:bg|text|text-shadow|border(?:-(?:[xytrbl]|s|e|bs|be|is|ie))?|ring|ring-offset|inset-ring|from|via|to|fill|stroke|outline|divide|decoration|placeholder|caret|shadow|inset-shadow|drop-shadow|accent)';
const PALETTE_COLOR =
  '(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3})(?:\\/\\d+)?';
const ARBITRARY_COLOR =
  '\\[[^\\]\\s]*(?:#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(|lab\\(|lch\\(|color\\()[^\\]\\s]*\\]';

/**
 * A palette or arbitrary color utility, with any variant prefix (`dark:`, `hover:`, `lg:`…).
 * Known gap: arbitrary CSS named colors (`bg-[red]`) are not detected; review catches those.
 */
const COLOR_CLASS = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*${COLOR_UTILITY}-(?:${PALETTE_COLOR}|${ARBITRARY_COLOR})(?![\\w-])`,
  'g',
);

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

/** Custom property names declared directly inside the first `<selector> { … }` block. */
function declaredProperties(css: string, selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No "${selector} {" block in globals.css`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return [...body.matchAll(/^\s*--([\w-]+):/gm)].map((match) => match[1]);
}

const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
// Chart tokens are a separate group: hex values read by name by the chart theme adapter,
// never exposed as Tailwind utilities (docs/design-system.md, Color Palettes): the categorical
// `--chart-N`, the sequential `--chart-seq-N` with `--chart-no-data`, and the energy mix `--energy-*`.
const isCategoricalToken = (token: string): boolean => /^chart-\d+$/.test(token);
const isSequentialToken = (token: string): boolean =>
  token.startsWith('chart-seq-') || token === CHART_NO_DATA_TOKEN;
const isEnergyToken = (token: string): boolean => token.startsWith('energy-');
const isChartToken = (token: string): boolean => token.startsWith('chart-') || isEnergyToken(token);
const lightTokens = declaredProperties(css, ':root');
const darkTokens = declaredProperties(css, '.dark');
const lightUiTokens = lightTokens.filter((token) => !isChartToken(token));
const lightChartTokens = lightTokens.filter(isChartToken);
const darkChartTokens = darkTokens.filter(isChartToken);
const lightCategoricalTokens = lightTokens.filter(isCategoricalToken);
const lightEnergyTokens = lightTokens.filter(isEnergyToken);
const lightSequentialTokens = lightTokens.filter(isSequentialToken);

const themeMappings = [
  ...css
    .slice(css.indexOf('@theme inline {'))
    .matchAll(/^\s*--(?:color|drop-shadow)-([\w-]+):\s*var\(--([\w-]+)\);/gm),
].map(([, utilityName, rawToken]) => ({ utilityName, rawToken }));

const sourceFiles = listSourceFiles(SRC_DIR).filter((file) => file !== GLOBALS_CSS);
const sourceText = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

describe('design tokens — globals.css', () => {
  it('should declare tokens on :root and .dark', () => {
    expect(lightTokens.length).toBeGreaterThan(0);
    expect(themeMappings.length).toBeGreaterThan(0);
  });

  it('should give every token both a light and a dark value', () => {
    expect([...darkTokens].sort()).toEqual([...lightTokens].sort());
  });

  it('should expose every token through @theme inline', () => {
    const mapped = new Set(themeMappings.map(({ rawToken }) => rawToken));
    expect(lightUiTokens.filter((token) => !mapped.has(token))).toEqual([]);
  });

  it('should not map chart tokens through @theme inline', () => {
    expect(themeMappings.filter(({ rawToken }) => isChartToken(rawToken))).toEqual([]);
    expect(css.slice(css.indexOf('@theme inline {'))).not.toContain('--color-chart-');
    expect(css.slice(css.indexOf('@theme inline {'))).not.toContain('--color-energy-');
  });

  it('should only map @theme inline entries to declared tokens', () => {
    const declared = new Set(lightTokens);
    expect(themeMappings.filter(({ rawToken }) => !declared.has(rawToken))).toEqual([]);
  });

  it('should use every token outside globals.css', () => {
    // Anchored on the utility prefix so `bg-nav-surface` does not count as a use of `surface`.
    const isUsed = ({
      utilityName,
      rawToken,
    }: {
      utilityName: string;
      rawToken: string;
    }): boolean =>
      new RegExp(
        `(?<![\\w-])(?:[\\w-]+:)*${COLOR_UTILITY}-${utilityName}(?:\\/\\d+)?(?![\\w-])`,
      ).test(sourceText) || sourceText.includes(`var(--${rawToken})`);
    const orphans = themeMappings
      .filter((mapping) => !isUsed(mapping))
      .map(({ rawToken }) => rawToken);
    expect(orphans).toEqual([]);
  });
});

describe('design tokens — chart tokens', () => {
  it('should declare exactly the names the chart theme adapter reads', () => {
    expect([...lightCategoricalTokens].sort()).toEqual([...CHART_COLOR_TOKENS].sort());
  });

  it('should declare exactly the energy mix names the chart theme adapter reads', () => {
    expect([...lightEnergyTokens].sort()).toEqual([...CHART_ENERGY_TOKENS].sort());
    expect(lightEnergyTokens).toHaveLength(8);
  });

  it('should give every chart token a light and a dark hex value', () => {
    expect([...darkChartTokens].sort()).toEqual([...lightChartTokens].sort());
    for (const token of lightChartTokens) {
      expect(css).toMatch(new RegExp(`--${token}:\\s*#[0-9a-fA-F]{6};`));
    }
  });

  it('should declare exactly the sequential and no-data names the chart theme adapter reads', () => {
    expect([...lightSequentialTokens].sort()).toEqual(
      [...CHART_SEQUENTIAL_TOKENS, CHART_NO_DATA_TOKEN].sort(),
    );
  });

  it('should only declare chart tokens of a known palette', () => {
    const known = (token: string): boolean =>
      isCategoricalToken(token) || isSequentialToken(token) || isEnergyToken(token);
    expect(lightChartTokens.filter((token) => !known(token))).toEqual([]);
  });
});

const WARNING_TOKENS = ['warning-surface', 'warning-line', 'warning-fg'] as const;
const REPO_ROOT = path.resolve(__dirname, '../../..');

type Theme = 'light' | 'dark';
type Oklch = { l: number; c: number; h: number };

function themeBlock(theme: Theme): string {
  const start = css.indexOf(theme === 'light' ? ':root {' : '.dark {');
  return css.slice(start, css.indexOf('\n}', start));
}

function oklchOf(theme: Theme, token: string): Oklch {
  const match = new RegExp(`--${token}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(
    themeBlock(theme),
  );
  if (!match) throw new Error(`No oklch() value for --${token} in the ${theme} theme`);
  return { l: Number(match[1]) / 100, c: Number(match[2]), h: Number(match[3]) };
}

/** WCAG relative luminance of an OKLCH color (OKLab to linear sRGB, clipped to gamut). */
function relativeLuminance({ l, c, h }: Oklch): number {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const lms1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const lms2 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const lms3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (value: number): number => Math.min(1, Math.max(0, value));
  const red = clip(4.0767416621 * lms1 - 3.3077115913 * lms2 + 0.2309699292 * lms3);
  const green = clip(-1.2684380046 * lms1 + 2.6097574011 * lms2 - 0.3413193965 * lms3);
  const blue = clip(-0.0041960863 * lms1 - 0.7034186147 * lms2 + 1.707614701 * lms3);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: Oklch, background: Oklch): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** The "Warning tokens: contrast" table of docs/design-system.md, as ratio cells per theme. */
function documentedRatio(pair: string, theme: Theme): string {
  const docs = fs.readFileSync(path.join(REPO_ROOT, 'docs/design-system.md'), 'utf8');
  const row = docs.split('\n').find((line) => line.startsWith(`| \`warning-fg\` on \`${pair}\``));
  if (!row) throw new Error(`No documented contrast row for ${pair}`);
  const cells = row
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);
  return cells[theme === 'light' ? 1 : 2];
}

describe('design tokens — warning tokens', () => {
  const consumers = ['components/StaleDataNotice.tsx', 'components/DataUnavailable.tsx']
    .map((file) => fs.readFileSync(path.join(SRC_DIR, file), 'utf8'))
    .join('\n');

  it('should declare every warning token in both themes and map it through @theme inline', () => {
    const mapped = themeMappings.map(({ rawToken }) => rawToken);
    for (const token of WARNING_TOKENS) {
      expect(lightTokens).toContain(token);
      expect(darkTokens).toContain(token);
      expect(mapped).toContain(token);
    }
  });

  it('should be referenced by the stale notice and the unavailable state', () => {
    for (const token of WARNING_TOKENS) {
      expect(consumers).toMatch(new RegExp(`(?<![\\w-])${COLOR_UTILITY}-${token}(?![\\w-])`));
    }
  });

  it.each<Theme>(['light', 'dark'])(
    'should meet the WCAG thresholds for warning-fg in the %s theme',
    (theme) => {
      const foreground = oklchOf(theme, 'warning-fg');

      expect(contrastRatio(foreground, oklchOf(theme, 'warning-surface'))).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(foreground, oklchOf(theme, 'surface'))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(foreground, oklchOf(theme, 'surface-raised'))).toBeGreaterThanOrEqual(3);
    },
  );

  it.each<[Theme]>([['light'], ['dark']])(
    'should record the measured contrast ratios in docs/design-system.md (%s theme)',
    (theme) => {
      const foreground = oklchOf(theme, 'warning-fg');
      const measured: [string, number][] = [
        ['warning-surface', contrastRatio(foreground, oklchOf(theme, 'warning-surface'))],
        ['surface', contrastRatio(foreground, oklchOf(theme, 'surface'))],
        ['surface-raised', contrastRatio(foreground, oklchOf(theme, 'surface-raised'))],
      ];

      for (const [pair, ratio] of measured) {
        expect(documentedRatio(pair, theme)).toBe(`${ratio.toFixed(2)}:1`);
      }
    },
  );
});

describe('design tokens — pages and components', () => {
  const files = SCANNED_DIRS.flatMap(listSourceFiles);

  it('should scan the page and component sources', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('should not use palette or arbitrary color utilities outside the documented exceptions', () => {
    const violations = files.flatMap((file) => {
      const relativePath = path.relative(SRC_DIR, file).split(path.sep).join('/');
      const allowed = ALLOWED_COLOR_CLASSES[relativePath] ?? [];
      const found = fs.readFileSync(file, 'utf8').match(COLOR_CLASS) ?? [];
      return found
        .filter((className) => !allowed.includes(className))
        .map((className) => `${relativePath}: ${className}`);
    });
    expect(violations).toEqual([]);
  });

  it('should not treat flag-icons classes as color utilities', () => {
    const flagMarkup = '<span className="fi fi-ar rounded-sm ring-1 ring-line-strong" />';
    expect(flagMarkup.match(COLOR_CLASS)).toBeNull();
  });

  it('should keep every allowlisted exception in use', () => {
    const stale = Object.entries(ALLOWED_COLOR_CLASSES).flatMap(([relativePath, classes]) => {
      const text = fs.readFileSync(path.join(SRC_DIR, relativePath), 'utf8');
      return classes
        .filter((className) => !text.includes(className))
        .map((className) => `${relativePath}: ${className}`);
    });
    expect(stale).toEqual([]);
  });
});
