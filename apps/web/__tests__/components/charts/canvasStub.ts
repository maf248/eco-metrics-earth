/**
 * jsdom has no canvas 2D context, and an un-stubbed `getContext` call prints a
 * "not implemented" error. This stub paints a fake 1x1 canvas: it parses `#rrggbb` and
 * `rgba(0, 0, 0, 0)` fill styles into pixel data and, like a real canvas, ignores any
 * other (invalid) value and keeps the previous one.
 */
const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

export function stubCanvasContext(): jest.SpyInstance {
  return jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function stubGetContext() {
      let fillStyle = '#000000';
      return {
        clearRect: () => undefined,
        fillRect: () => undefined,
        set fillStyle(value: string) {
          if (HEX.test(value) || value === TRANSPARENT) {
            fillStyle = value;
          }
        },
        get fillStyle() {
          return fillStyle;
        },
        getImageData: () => {
          const match = HEX.exec(fillStyle);
          const channels = match
            ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16), 255]
            : [0, 0, 0, fillStyle === TRANSPARENT ? 0 : 255];
          return { data: Uint8ClampedArray.from(channels) };
        },
      } as unknown as CanvasRenderingContext2D;
    } as unknown as HTMLCanvasElement['getContext']);
}

const LIGHT_TOKENS: Record<string, string> = {
  'chart-1': '#2a78d6',
  'chart-2': '#eb6834',
  'chart-3': '#1baf7a',
  'chart-4': '#eda100',
  'chart-5': '#e87ba4',
  'chart-6': '#008300',
  'chart-7': '#6250d6',
  'chart-8': '#e34948',
  'energy-coal': '#252933',
  'energy-gas': '#caac7c',
  'energy-oil': '#97541c',
  'energy-nuclear': '#6d028d',
  'energy-hydro': '#0475d5',
  'energy-wind': '#00c4c6',
  'energy-solar': '#e9a400',
  'energy-bio': '#26771e',
  'chart-seq-1': '#f5af20',
  'chart-seq-2': '#ec8300',
  'chart-seq-3': '#de5300',
  'chart-seq-4': '#c1291b',
  'chart-seq-5': '#8a161b',
  'chart-seq-good-1': '#58c69b',
  'chart-seq-good-2': '#36a980',
  'chart-seq-good-3': '#148c66',
  'chart-seq-good-4': '#126e50',
  'chart-seq-good-5': '#0f513b',
  'chart-no-data': '#e5e5e5',
  line: '#e5e7eb',
  'fg-muted': '#6b7280',
  'line-subtle': '#f3f4f6',
  'surface-raised': '#ffffff',
  'line-strong': '#e5e7eb',
  fg: '#111827',
  'fg-secondary': '#4b5563',
};

/** Declares the chart-related custom properties on `<html>`, like `globals.css` does. */
export function declareTokens(overrides: Record<string, string> = {}): void {
  for (const [name, value] of Object.entries({ ...LIGHT_TOKENS, ...overrides })) {
    document.documentElement.style.setProperty(`--${name}`, value);
  }
}

export function clearTokens(): void {
  for (const name of Object.keys(LIGHT_TOKENS)) {
    document.documentElement.style.removeProperty(`--${name}`);
  }
}
