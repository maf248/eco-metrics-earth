import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

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

const matchMediaMock = () =>
  jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock(),
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('should render a button with a descriptive aria-label', () => {
    renderWithTheme(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Toggle light/dark mode' })).toBeTruthy();
  });

  it('should toggle from light to dark mode on click', () => {
    localStorageMock.setItem('eco-metrics-theme', 'light');

    renderWithTheme(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light/dark mode' }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('eco-metrics-theme', 'dark');
  });

  it('should toggle from dark to light mode on click', () => {
    localStorageMock.setItem('eco-metrics-theme', 'dark');

    renderWithTheme(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light/dark mode' }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('eco-metrics-theme', 'light');
  });

  it('should render the lightbulb icon inside the button', () => {
    const { container } = renderWithTheme(<ThemeToggle />);

    expect(container.querySelector('svg')).not.toBeNull();
  });
});
