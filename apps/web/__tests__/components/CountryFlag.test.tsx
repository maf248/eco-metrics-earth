import fs from 'node:fs';
import path from 'node:path';

import { act, render } from '@testing-library/react';

import { CountryFlag } from '@/components/CountryFlag';
import { GlobeIcon } from '@/components/GlobeIcon';
import { ISO3_TO_ISO2 } from '@eco-metrics/shared';

describe('CountryFlag', () => {
  it('should render a decorative flag-icons span in lower case', () => {
    const { container } = render(<CountryFlag iso2="AR" />);

    const flag = container.firstElementChild;
    expect(flag).toHaveClass('fi', 'fi-ar');
    expect(flag).toHaveAttribute('aria-hidden', 'true');
    expect(flag).toHaveClass('ring-1', 'ring-line-strong');
  });

  it('should render a globe instead of a flag when there is no alpha-2 code', () => {
    const { container } = render(<CountryFlag iso2={null} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('[class*="fi-"]')).toBeNull();
  });

  it('should reveal a lazy flag after mount when IntersectionObserver is unavailable', () => {
    const { container } = render(<CountryFlag iso2="BR" lazy />);

    expect(container.firstElementChild).toHaveClass('fi-br');
  });

  describe('with IntersectionObserver', () => {
    const originalObserver = global.IntersectionObserver;
    let trigger: (isIntersecting: boolean) => void = () => undefined;
    let disconnectSpy: jest.Mock;

    beforeEach(() => {
      disconnectSpy = jest.fn();
      global.IntersectionObserver = class implements IntersectionObserver {
        readonly root = null;
        readonly rootMargin = '';
        readonly thresholds = [];
        constructor(callback: IntersectionObserverCallback) {
          trigger = (isIntersecting) =>
            callback([{ isIntersecting } as IntersectionObserverEntry], this);
        }
        observe() {}
        unobserve() {}
        disconnect = disconnectSpy;
        takeRecords() {
          return [];
        }
      };
    });

    afterEach(() => {
      global.IntersectionObserver = originalObserver;
    });

    it('should render a same-size placeholder until the flag is visible', () => {
      const { container } = render(<CountryFlag iso2="BR" lazy />);

      expect(container.firstElementChild).not.toHaveClass('fi');
      expect(container.firstElementChild).toHaveClass('h-4', 'bg-well');
    });

    it('should ignore entries that are not intersecting', () => {
      const { container } = render(<CountryFlag iso2="BR" lazy />);

      trigger(false);

      expect(container.firstElementChild).not.toHaveClass('fi');
    });

    it('should render the flag and stop observing once it intersects', () => {
      const { container } = render(<CountryFlag iso2="BR" lazy />);

      act(() => trigger(true));

      expect(container.firstElementChild).toHaveClass('fi', 'fi-br');
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});

describe('GlobeIcon', () => {
  it('should be hidden from assistive technology without a title', () => {
    const { container } = render(<GlobeIcon />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should expose an accessible name when given a title', () => {
    const { getByRole } = render(<GlobeIcon title="World" />);

    expect(getByRole('img', { name: 'World' })).toBeInTheDocument();
  });

  it('should inherit currentColor and accept SVG props', () => {
    const { container } = render(<GlobeIcon className="h-4 w-4" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveClass('h-4', 'w-4');
  });
});

describe('flag-icons coverage', () => {
  const css = fs.readFileSync(
    path.resolve(__dirname, '../../../../node_modules/flag-icons/css/flag-icons.min.css'),
    'utf8',
  );

  it('should pin flag-icons to an exact version', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };

    expect(pkg.dependencies['flag-icons']).toBe('7.6.0');
  });

  it('should have a .fi-xx rule for every alpha-2 code of the crosswalk, including XK', () => {
    const codes = [...new Set([...Object.values(ISO3_TO_ISO2), 'XK'])];

    const missing = codes.filter((code) => !css.includes(`.fi-${code.toLowerCase()}`));

    expect(missing).toEqual([]);
  });
});
