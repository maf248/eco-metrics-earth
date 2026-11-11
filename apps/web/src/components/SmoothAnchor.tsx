'use client';

import type { ComponentProps } from 'react';

/** Set on `<html>` while an in-page anchor scrolls; `globals.css` makes that scroll smooth. */
export const ANCHOR_SCROLLING_CLASS = 'anchor-scrolling';

/** Longer than the browser's smooth scroll, so the class outlives it. */
export const ANCHOR_SCROLL_MS = 1000;

type SmoothAnchorProps = Omit<ComponentProps<'a'>, 'href' | 'onClick'> & {
  /** A fragment of the current page, e.g. `#topics`. */
  href: `#${string}`;
};

/**
 * An in-page anchor whose jump is animated. The browser still does the navigation (hash,
 * focus, history), so it works without JavaScript. Smooth scrolling is on only for this
 * click and not site-wide, where it would animate the browser's scroll restoration on back
 * and forward.
 */
export function SmoothAnchor({ href, children, ...props }: SmoothAnchorProps) {
  return (
    <a
      {...props}
      href={href}
      onClick={() => {
        const root = document.documentElement;
        root.classList.add(ANCHOR_SCROLLING_CLASS);
        setTimeout(() => root.classList.remove(ANCHOR_SCROLLING_CLASS), ANCHOR_SCROLL_MS);
      }}
    >
      {children}
    </a>
  );
}
