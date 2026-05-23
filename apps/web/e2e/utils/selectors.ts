/**
 * Reusable selectors for common DOM elements.
 *
 * These match the actual DOM structure in the current codebase.
 * Prefer getByRole / getByText in tests; use these for
 * aria-label / id / structural selectors that Playwright built-in
 * locators cannot express directly.
 */
export const selectors = {
  /** Main content landmark (id="main-content") */
  mainContent: '#main-content',
  /** Skip-to-content link (href="#main-content") */
  skipLink: 'a[href="#main-content"]',
  /** Navigation landmark */
  nav: 'nav[aria-label="Main navigation"]',
  /** Mobile-only top header */
  mobileHeader: 'header[aria-label="Site header"]',
  /** Brand / home link (shared aria-label on MobileHeader + Navbar sidebar) */
  brandLink: 'a[aria-label="eco-metrics earth — go to home"]',
  /** Navigation scroll container (ul wrapping NavLinks) */
  navList: 'ul[aria-label="Navigation items"]',
  /** 404 page icon wrapper */
  notFoundIcon: '[data-testid="not-found-icon"]',
  /** SVG inside brand/home link */
  siteLogo: 'a[aria-label="eco-metrics earth — go to home"] svg',
};
