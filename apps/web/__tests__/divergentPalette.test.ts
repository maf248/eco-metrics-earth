/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

import { CHART_DIVERGENT_TOKENS, CHART_NO_DATA_TOKEN } from '../src/components/charts/chartTokens';

/**
 * Palette checks of the divergent ramp (docs/design-system.md, "Divergent (light / dark)"):
 * lightness order on each arm, adjacent separation under protanopia, deuteranopia and
 * tritanopia, and the neutral middle against the no-data fill. The values come from globals.css.
 */

const GLOBALS_CSS = path.resolve(__dirname, '../src/app/globals.css');
const css = fs.readFileSync(GLOBALS_CSS, 'utf8');

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

/** sRGB (0..1) to OKLab (Björn Ottosson's matrices). */
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

/** Euclidean OKLab distance times 100: the ΔE×100 of docs/design-system.md. */
function deltaE100(a: Lab, b: Lab): number {
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Machado et al. 2009 severity 1.0 matrices, applied to linear RGB. */
const CVD_MATRICES = {
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
} as const;

const fromLinear = (channel: number): number => {
  const clipped = Math.min(1, Math.max(0, channel));
  return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
};

function simulate(rgb: Rgb, matrix: readonly (readonly number[])[]): Rgb {
  const linear = rgb.map(toLinear);
  return matrix.map((row) =>
    fromLinear(row.reduce((sum, weight, i) => sum + weight * linear[i], 0)),
  ) as unknown as Rgb;
}

const THEMES: Theme[] = ['light', 'dark'];
const CLASSES = [1, 2, 3, 4, 5, 6, 7] as const;
/** Class 4 (`chart-div-4`, the neutral middle) is the fourth class, so index 3. */
const MIDDLE = 4;
const MIDDLE_INDEX = MIDDLE - 1;

describe('divergent palette', () => {
  it.each(THEMES)(
    'should order lightness monotonically towards the middle on each arm in the %s theme',
    (theme) => {
      const lightness = CLASSES.map((i) => toOklab(hexOf(theme, `chart-div-${i}`))[0]);
      // Each arm runs from its outer class to the middle (class 4, the last element of the loss arm).
      const loss = lightness.slice(0, MIDDLE_INDEX + 1);
      const gain = lightness.slice(MIDDLE_INDEX).reverse();
      // On white the middle is the lightest class (lightness rises towards it); on black it is the
      // darkest, so the extremes are the brightest and most salient (lightness falls towards it).
      const direction = theme === 'light' ? 1 : -1;

      for (const arm of [loss, gain]) {
        for (let i = 1; i < arm.length; i += 1) {
          expect(direction * (arm[i] - arm[i - 1])).toBeGreaterThanOrEqual(0.06);
        }
      }
    },
  );

  it('should make the dark middle the darkest class and the outer classes the brightest', () => {
    const lightness = CLASSES.map((i) => toOklab(hexOf('dark', `chart-div-${i}`))[0]);

    expect(Math.min(...lightness)).toBe(lightness[MIDDLE_INDEX]);
    expect(Math.max(lightness[0], lightness[6])).toBe(Math.max(...lightness));
  });

  it.each(THEMES)(
    'should keep the middle class apart from the no-data fill in the %s theme',
    (theme) => {
      const middle = toOklab(hexOf(theme, `chart-div-${MIDDLE}`));
      // The middle is a neutral, not a hue: OKLCH chroma stays under 0.02 (documented at 0.015 / 0.016).
      expect(Math.hypot(middle[1], middle[2])).toBeLessThan(0.02);
      const noData = toOklab(hexOf(theme, CHART_NO_DATA_TOKEN));

      expect(deltaE100(middle, noData)).toBeGreaterThanOrEqual(15);
    },
  );

  it.each(THEMES)(
    'should separate adjacent classes by ΔE×100 of at least 8 under every simulated deficiency in the %s theme',
    (theme) => {
      const rgb = CLASSES.map((i) => hexOf(theme, `chart-div-${i}`));

      for (const matrix of Object.values(CVD_MATRICES)) {
        const simulated = rgb.map((color) => toOklab(simulate(color, matrix)));
        for (let i = 1; i < simulated.length; i += 1) {
          expect(deltaE100(simulated[i - 1], simulated[i])).toBeGreaterThanOrEqual(8);
        }
      }
    },
  );

  it('should name the seven tokens the palette checks read', () => {
    expect(CHART_DIVERGENT_TOKENS).toEqual(CLASSES.map((i) => `chart-div-${i}`));
  });
});
