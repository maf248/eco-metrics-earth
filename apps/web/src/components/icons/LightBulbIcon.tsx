import type React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

export default function LightBulbIcon({ title, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(title ? { 'aria-labelledby': 'lightbulb-icon-title' } : { 'aria-hidden': 'true' })}
      {...props}
    >
      {title && <title id="lightbulb-icon-title">{title}</title>}
      {/* Screw base threads */}
      <path d="M9.5 17.5h5" />
      <path d="M9 19.5h6" />
      <path d="M8.5 21.5h7" />
      {/* Glass bulb — subtle fill for glow effect */}
      <path
        d="M12 2.5C8.272 2.5 5.25 5.522 5.25 9.25c0 2.04.962 3.853 2.457 5.04.235.187.373.478.373.788v2.172h7.84v-2.172c0-.31.138-.6.373-.788 1.495-1.187 2.457-3 2.457-5.04 0-3.728-3.022-6.75-6.75-6.75z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* Filament */}
      <path d="M9.5 10V7.5l2.5 3 2.5-3V10" />
    </svg>
  );
}
