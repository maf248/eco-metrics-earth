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

import { CHART_COLOR_TOKENS } from '../src/components/charts/chartTokens';

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
// never exposed as Tailwind utilities (docs/design-system.md, Color Palettes).
const isChartToken = (token: string): boolean => token.startsWith('chart-');
const lightTokens = declaredProperties(css, ':root');
const darkTokens = declaredProperties(css, '.dark');
const lightUiTokens = lightTokens.filter((token) => !isChartToken(token));
const lightChartTokens = lightTokens.filter(isChartToken);
const darkChartTokens = darkTokens.filter(isChartToken);
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
    expect([...lightChartTokens].sort()).toEqual([...CHART_COLOR_TOKENS].sort());
  });

  it('should give every chart token a light and a dark hex value', () => {
    expect([...darkChartTokens].sort()).toEqual([...lightChartTokens].sort());
    for (const token of lightChartTokens) {
      expect(css).toMatch(new RegExp(`--${token}:\\s*#[0-9a-fA-F]{6};`));
    }
  });

  it('should not declare sequential tokens before a change uses them', () => {
    expect(css).not.toContain('--chart-seq-');
  });
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
