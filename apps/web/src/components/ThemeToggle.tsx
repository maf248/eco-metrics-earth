'use client';

import { LightBulbIcon } from '@/components/icons';
import { useTheme } from '@/components/ThemeProvider';

/**
 * A single lamp/lightbulb toggle button that switches between light and dark mode.
 *
 * The lamp appearance is driven ENTIRELY by CSS via the `dark` class on <html>,
 * which a blocking <script> in the root layout sets before first paint.
 * This ensures zero visual flash — the icon renders in the correct colour
 * from the very first frame, even before React finishes hydrating.
 *
 * Accessibility:
 *  - aria-label describes the action the button will perform
 *  - Native <button> keyboard support (Enter / Space)
 */
export default function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle light/dark mode"
      onClick={toggleTheme}
      className={[
        'fixed top-2 right-4 z-50 lg:top-4',
        'w-10 h-10 rounded-full',
        'flex items-center justify-center',
        'bg-toggle',
        'hover:bg-toggle-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
        'transition-all duration-300',
      ].join(' ')}
    >
      {/*
       * Appearance is CSS-only via dark: variants:
       *  - Light mode (no .dark on <html>): amber-400 with warm glow  → "lit"
       *  - Dark mode (.dark on <html>):    gray-400, no glow         → "unlit"
       */}
      <LightBulbIcon
        aria-hidden
        className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] dark:text-gray-400 dark:drop-shadow-none transition-all duration-300"
      />
    </button>
  );
}
