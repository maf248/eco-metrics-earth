import type { SVGProps } from 'react';

interface GlobeIconProps extends SVGProps<SVGSVGElement> {
  /** Accessible name. Without it the icon is decorative and hidden from assistive technology. */
  title?: string;
}

/**
 * Monochrome globe that inherits `currentColor`. A UI glyph, not a category icon,
 * so it lives outside `components/icons/` (the multicolor, one-per-category set).
 */
export function GlobeIcon({ title, ...props }: GlobeIconProps) {
  const labelProps = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...labelProps}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.4 3.9 5.5 3.9 9S14.5 18.6 12 21c-2.5-2.4-3.9-5.5-3.9-9S9.5 5.4 12 3z" />
    </svg>
  );
}
