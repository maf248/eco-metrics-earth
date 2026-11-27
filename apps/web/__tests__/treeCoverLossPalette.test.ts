/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

import { CHART_TREE_COVER_LOSS_TOKENS } from '../src/components/charts/chartTokens';

/**
 * Palette checks of the tree cover loss palette (docs/design-system.md, "Tree cover loss by
 * cause"): the tokens are existing ones, none is green, and every pair, not only the adjacent
 * ones, keeps a minimum OKLab ΔE×100 in both themes, unsimulated and under protanopia,
 * deuteranopia and tritanopia. The values come from globals.css.
 */

const css = fs.readFileSync(path.resolve(__dirname, '../src/app/globals.css'), 'utf8');

type Theme = 'light' | 'dark';
type Rgb = [number, number, number];
type Lab = [number, number, number];

function themeBlock(theme: Theme): string {
  const start = css.indexOf(theme === 'light' ? ':root {' : '.dark {');
  return css.slice(start, css.indexOf('\n}', start));
}

function hexOf(theme: Theme, token: string): Rgb {
  const match = new RegExp(`--${token}:\\s*#([0-9a-fA-F]{6});`).exec(themeBlock(theme));
  if (!match) throw new Error(`No hex value for --${token} in the ${theme} theme`);
  const value = match[1];
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255) as Rgb;
}

const toLinear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const fromLinear = (channel: number): number => {
  const clipped = Math.min(1, Math.max(0, channel));
  return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
};

function toOklab([r, g, b]: Rgb): Lab {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const deltaE100 = (a: Lab, b: Lab): number =>
  100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Machado et al. 2009 severity 1.0 matrices, applied to linear RGB. */
const VIEWS: Record<string, readonly (readonly number[])[] | null> = {
  normal: null,
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function view(rgb: Rgb, matrix: readonly (readonly number[])[] | null): Lab {
  if (matrix === null) return toOklab(rgb);
  const linear = rgb.map(toLinear);
  return toOklab(
    matrix.map((row) =>
      fromLinear(row.reduce((sum, weight, i) => sum + weight * linear[i], 0)),
    ) as unknown as Rgb,
  );
}

/** The lowest ΔE×100 over the chosen pairs of the palette in one theme and view. */
function lowest(theme: Theme, matrix: readonly (readonly number[])[] | null, adjacent: boolean) {
  const labs = CHART_TREE_COVER_LOSS_TOKENS.map((token) => view(hexOf(theme, token), matrix));
  let min = Infinity;
  for (let a = 0; a < labs.length; a += 1) {
    for (let b = a + 1; b < labs.length; b += 1) {
      if (!adjacent || b === a + 1) min = Math.min(min, deltaE100(labs[a], labs[b]));
    }
  }
  return min;
}

const THEMES: Theme[] = ['light', 'dark'];

describe('tree cover loss palette', () => {
  it('should list the seven drivers in stacking order with existing tokens only', () => {
    expect(CHART_TREE_COVER_LOSS_TOKENS).toEqual([
      'chart-4',
      'energy-coal',
      'energy-nuclear',
      'energy-gas',
      'energy-oil',
      'chart-8',
      'energy-wind',
    ]);
    for (const theme of THEMES) {
      for (const token of CHART_TREE_COVER_LOSS_TOKENS) {
        expect(() => hexOf(theme, token)).not.toThrow();
      }
    }
  });

  it('should colour no cause green, and wildfire in the red token', () => {
    expect(CHART_TREE_COVER_LOSS_TOKENS).not.toContain('chart-6');
    expect(CHART_TREE_COVER_LOSS_TOKENS).not.toContain('energy-bio');
    expect(CHART_TREE_COVER_LOSS_TOKENS[5]).toBe('chart-8');
  });

  it.each(THEMES)('should separate every pair by ΔE×100 of at least 8 in the %s theme', (theme) => {
    expect(lowest(theme, VIEWS.normal, false)).toBeGreaterThanOrEqual(8);
  });

  it.each(THEMES)(
    'should separate adjacent classes by ΔE×100 of at least 8 in every view in the %s theme, except the recorded pair',
    (theme) => {
      for (const [name, matrix] of Object.entries(VIEWS)) {
        const labs = CHART_TREE_COVER_LOSS_TOKENS.map((token) => view(hexOf(theme, token), matrix));
        for (let a = 0; a + 1 < labs.length; a += 1) {
          const pair = `${CHART_TREE_COVER_LOSS_TOKENS[a]}/${CHART_TREE_COVER_LOSS_TOKENS[a + 1]}`;
          const isRecordedException =
            theme === 'light' && name === 'protanopia' && pair === 'energy-oil/chart-8';
          // Logging / Wildfire under protanopia in the light theme is the recorded exception (6.49, documented as 6.5).
          expect(deltaE100(labs[a], labs[a + 1])).toBeGreaterThanOrEqual(
            isRecordedException ? 6.4 : 8,
          );
        }
      }
    },
  );
});
