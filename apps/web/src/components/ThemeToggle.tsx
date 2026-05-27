'use client';

import { LightBulbIcon } from '@/components/icons';
import { useTheme } from '@/components/ThemeProvider';

/**
 * A single lamp/lightbulb toggle button that switches between light and dark mode.
 *
 * Visual design:
 *  - Lit (light mode):   amber-400 icon with a warm drop-shadow glow
 *  - Unlit (dark mode):  gray-400 icon with no glow
 *
 * Positioned at the top-right corner of the viewport (same location as the
 * previous SettingsMenu gear button).
 *
 * Accessibility:
 *  - aria-label describes the action the button will perform
 *  - Native <button> keyboard support (Enter / Space)
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLit = theme === 'light';

  return (
    <button
      type="button"
      aria-label={isLit ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggleTheme}
      className={[
        'fixed top-2 right-4 z-50 lg:top-4',
        'w-10 h-10 rounded-full',
        'flex items-center justify-center',
        'bg-gray-200 dark:bg-white/10',
        'hover:bg-gray-300 dark:hover:bg-white/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
        'transition-all duration-300',
      ].join(' ')}
    >
      <LightBulbIcon
        aria-hidden
        className={[
          'w-5 h-5',
          isLit ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-gray-400',
        ].join(' ')}
      />
    </button>
  );
}
