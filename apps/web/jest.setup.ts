import '@testing-library/jest-dom';
import { setPlatformAPI } from 'zrender/lib/core/platform';

/**
 * Jest global setup — runs after the test framework is installed, before each test file.
 *
 * Polyfills browser APIs that jsdom does not implement:
 *  - ResizeObserver: used by NavScrollContainer to detect scroll overflow on resize.
 *    The no-op implementation is sufficient for unit tests that only verify rendering
 *    and DOM structure, not actual resize behaviour.
 *  - AbortSignal.timeout: used by server-side fetch helpers to bound request duration.
 *    Node 24 and modern browsers implement it natively; jsdom does not.
 */
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = (ms: number): AbortSignal => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

/**
 * jsdom has no canvas, which ECharts uses to measure label text even under the SVG
 * renderer. An approximate width (7px per character) is enough to lay out unit-test charts.
 * Only zrender's platform module is imported so tests that render no chart stay fast.
 */
setPlatformAPI({
  measureText: (text: string) => ({ width: text.length * 7 }),
});
