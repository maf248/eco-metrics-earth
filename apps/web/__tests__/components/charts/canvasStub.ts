/**
 * jsdom has no canvas 2D context, and an un-stubbed `getContext` call prints a
 * "not implemented" error. This stub paints a fake 1x1 canvas: it parses `#rrggbb`
 * fill styles into pixel data and returns opaque black for anything else.
 */
export function stubCanvasContext(): jest.SpyInstance {
  return jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function stubGetContext() {
      let fillStyle = '#000000';
      return {
        clearRect: () => undefined,
        fillRect: () => undefined,
        set fillStyle(value: string) {
          fillStyle = value;
        },
        get fillStyle() {
          return fillStyle;
        },
        getImageData: () => {
          const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fillStyle);
          const channels = match
            ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16), 255]
            : [0, 0, 0, 255];
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
