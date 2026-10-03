import { act, render, renderHook, screen } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import ThemeProvider, { useTheme } from '@/components/ThemeProvider';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const matchMediaMock = (prefersDark: boolean) =>
  jest.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle-button">
        Toggle
      </button>
    </div>
  );
}

function ThemeConsumerOutside() {
  useTheme();
  return null;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  describe('initial theme detection', () => {
    it('should default to dark theme when no stored preference and no light system preference', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock(false),
      });

      renderWithTheme(<ThemeConsumer />);

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });

    it('should use dark theme from localStorage when stored', () => {
      localStorageMock.setItem('eco-metrics-theme', 'dark');

      renderWithTheme(<ThemeConsumer />);

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });

    it('should use light theme from localStorage when stored', () => {
      localStorageMock.setItem('eco-metrics-theme', 'light');

      renderWithTheme(<ThemeConsumer />);

      expect(screen.getByTestId('theme-value').textContent).toBe('light');
    });

    it('should apply dark class to html when stored theme is dark', () => {
      localStorageMock.setItem('eco-metrics-theme', 'dark');

      renderWithTheme(<ThemeConsumer />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not apply dark class to html when stored theme is light', () => {
      localStorageMock.setItem('eco-metrics-theme', 'light');

      renderWithTheme(<ThemeConsumer />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should default to dark when system preference is dark and no stored value', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock(true),
      });

      renderWithTheme(<ThemeConsumer />);

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      localStorageMock.setItem('eco-metrics-theme', 'light');

      renderWithTheme(<ThemeConsumer />);

      const button = screen.getByTestId('toggle-button');
      act(() => {
        button.click();
      });

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('eco-metrics-theme', 'dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle from dark to light', () => {
      localStorageMock.setItem('eco-metrics-theme', 'dark');

      renderWithTheme(<ThemeConsumer />);

      const button = screen.getByTestId('toggle-button');
      act(() => {
        button.click();
      });

      expect(screen.getByTestId('theme-value').textContent).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('eco-metrics-theme', 'light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should persist to localStorage on toggle', () => {
      localStorageMock.setItem('eco-metrics-theme', 'light');

      renderWithTheme(<ThemeConsumer />);

      const button = screen.getByTestId('toggle-button');
      act(() => {
        button.click();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('localStorage error resilience', () => {
    it('should fall back to system preference when localStorage.getItem throws', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage unavailable');
      });
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock(false),
      });

      renderWithTheme(<ThemeConsumer />);

      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should still toggle in-memory when localStorage.setItem throws', () => {
      // Set up initial stored value first (this call must succeed)
      localStorageMock.setItem('eco-metrics-theme', 'light');

      // Then make the next setItem call throw
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage unavailable');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      renderWithTheme(<ThemeConsumer />);

      const button = screen.getByTestId('toggle-button');
      act(() => {
        button.click();
      });

      // Theme should still toggle in-memory
      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('useTheme hook', () => {
    it('should throw when used outside ThemeProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<ThemeConsumerOutside />)).toThrow(
        'useTheme must be used within a ThemeProvider',
      );

      consoleSpy.mockRestore();
    });

    it('should return theme context when used inside provider', () => {
      const wrapper = ({ children }: PropsWithChildren) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(typeof result.current.toggleTheme).toBe('function');
    });
  });
});
