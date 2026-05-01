/**
 * Jest global setup — runs after the test framework is installed, before each test file.
 *
 * Polyfills browser APIs that jsdom does not implement:
 *  - ResizeObserver: used by NavScrollContainer to detect scroll overflow on resize.
 *    The no-op implementation is sufficient for unit tests that only verify rendering
 *    and DOM structure, not actual resize behaviour.
 */
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
