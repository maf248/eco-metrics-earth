import type React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

/**
 * Neutral warning triangle for degraded states. Single-color (`currentColor`), unlike
 * the multicolor category icons, so it follows whichever token colors it.
 */
export default function WarningIcon({ title, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(title ? { 'aria-labelledby': 'warning-icon-title' } : { 'aria-hidden': 'true' })}
      {...props}
    >
      {title && <title id="warning-icon-title">{title}</title>}
      <path d="M12 3.5 2.75 19.5h18.5L12 3.5z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 10v4.5" />
      <path d="M12 17.25v.01" />
    </svg>
  );
}
