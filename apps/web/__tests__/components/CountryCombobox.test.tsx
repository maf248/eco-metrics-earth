import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

import { CountryCombobox, filterCountryOptions } from '@/components/CountryCombobox';
import type { CountryOption } from '@/components/CountryCombobox';

const OPTIONS: CountryOption[] = [
  { code: 'OWID_WRL', name: 'World', iso2: null },
  { code: 'ARG', name: 'Argentina', iso2: 'AR' },
  { code: 'BRA', name: 'Brazil', iso2: 'BR' },
  { code: 'CIV', name: "Côte d'Ivoire", iso2: 'CI' },
  { code: 'FIN', name: 'Finland', iso2: 'FI' },
  { code: 'ISL', name: 'Iceland', iso2: 'IS' },
  { code: 'OWID_KOS', name: 'Kosovo', iso2: 'XK' },
  { code: 'USA', name: 'United States', iso2: 'US' },
];

function setup(value = 'OWID_WRL') {
  const onChange = jest.fn();
  const utils = render(
    <CountryCombobox label="Country" options={OPTIONS} value={value} onChange={onChange} />,
  );
  const input = screen.getByRole('combobox', { name: 'Country' });
  return { ...utils, input, onChange };
}

const type = (input: HTMLElement, text: string): void => {
  fireEvent.change(input, { target: { value: text } });
};

const key = (input: HTMLElement, name: string): void => {
  fireEvent.keyDown(input, { key: name });
};

const optionNames = (): string[] =>
  screen.queryAllByRole('option').map((option) => option.textContent ?? '');

describe('CountryCombobox — roles and relationships', () => {
  it('should expose a labelled combobox that controls the listbox and is collapsed', () => {
    const { input } = setup();

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('autocomplete', 'off');
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    expect(document.getElementById(listboxId as string)).toHaveAttribute('role', 'listbox');
  });

  it('should show the selected name when closed', () => {
    const { input } = setup('OWID_WRL');

    expect(input).toHaveValue('World');
  });

  it('should show an empty input for an unknown value', () => {
    const { input } = setup('NOPE');

    expect(input).toHaveValue('');
  });

  it('should open the listbox with ArrowDown and reference the active option', () => {
    const { input } = setup();

    key(input, 'ArrowDown');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    const active = screen.getAllByRole('option')[0];
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', active.id);
  });

  it('should open on click', () => {
    const { input } = setup();

    fireEvent.click(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('should keep the list open when clicking an already open input', () => {
    const { input } = setup();
    fireEvent.click(input);

    fireEvent.click(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('CountryCombobox — filtering', () => {
  it('should list a name prefix match first', () => {
    const { input } = setup();

    type(input, 'arg');

    expect(optionNames()[0]).toBe('Argentina');
  });

  it('should list prefix matches before substring matches', () => {
    const { input } = setup();

    type(input, 'land');

    expect(optionNames()).toEqual(['Finland', 'Iceland']);
  });

  it('should ignore case and diacritics', () => {
    const { input } = setup();

    type(input, 'COTE');

    expect(optionNames()).toEqual(["Côte d'Ivoire"]);
  });

  it('should match the alpha-3 code', () => {
    const { input } = setup();

    type(input, 'usa');

    expect(optionNames()).toEqual(['United States']);
  });

  it('should list every option with World first for an empty query', () => {
    const { input } = setup();

    type(input, '');

    expect(optionNames()).toHaveLength(OPTIONS.length);
    expect(optionNames()[0]).toMatch(/^World/);
  });

  it('should show a non-selectable message and no active descendant when nothing matches', () => {
    const { input } = setup();

    type(input, 'zzzz');

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getAllByText('No countries found').length).toBeGreaterThan(0);
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(input).not.toHaveAttribute('aria-controls');
  });

  it('should restore aria-controls once matches exist again', () => {
    const { input } = setup();
    type(input, 'zzzz');

    type(input, 'arg');

    expect(document.getElementById(input.getAttribute('aria-controls') as string)).toHaveAttribute(
      'role',
      'listbox',
    );
  });

  it('should expose the chosen option as selected to assistive technology', () => {
    const { input } = setup('BRA');
    key(input, 'ArrowDown');

    expect(screen.getByRole('option', { name: /Brazil.*selected/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Argentina' })).toBeInTheDocument();
  });

  it('should announce the number of matches', () => {
    const { input } = setup();

    type(input, 'land');

    expect(screen.getByRole('status')).toHaveTextContent('2 countries found');
  });

  it('should announce a single match in the singular', () => {
    const { input } = setup();

    type(input, 'usa');

    expect(screen.getByRole('status')).toHaveTextContent('1 country found');
  });

  it('should announce when there are no matches', () => {
    const { input } = setup();

    type(input, 'zzzz');

    expect(screen.getByRole('status')).toHaveTextContent('No countries found');
  });

  it('should return the options unchanged for a blank query', () => {
    expect(filterCountryOptions(OPTIONS, '   ')).toBe(OPTIONS);
  });
});

describe('CountryCombobox — keyboard', () => {
  it('should activate the first option when ArrowDown opens the list', () => {
    const { input } = setup();

    key(input, 'ArrowDown');

    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should wrap from the last option to the first with ArrowDown', () => {
    const { input } = setup();
    key(input, 'ArrowDown');
    key(input, 'End');

    key(input, 'ArrowDown');

    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should wrap from the first option to the last with ArrowUp', () => {
    const { input } = setup();
    key(input, 'ArrowDown');

    key(input, 'ArrowUp');

    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('should open on the last option with ArrowUp while closed', () => {
    const { input } = setup();

    key(input, 'ArrowUp');

    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('should move the active option down and up', () => {
    const { input } = setup();
    key(input, 'ArrowDown');

    key(input, 'ArrowDown');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    key(input, 'ArrowUp');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should jump to the last and first option with End and Home while open', () => {
    const { input } = setup();
    key(input, 'ArrowDown');

    key(input, 'End');
    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');

    key(input, 'Home');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should leave Home and End to the text caret while closed', () => {
    const { input } = setup();

    const homeNotPrevented = fireEvent.keyDown(input, { key: 'Home' });
    const endNotPrevented = fireEvent.keyDown(input, { key: 'End' });

    expect(homeNotPrevented).toBe(true);
    expect(endNotPrevented).toBe(true);
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('should select the active option with Enter and close the list', () => {
    const { input, onChange } = setup();
    type(input, 'arg');

    key(input, 'Enter');

    expect(onChange).toHaveBeenCalledWith('ARG');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('should ignore Enter when the list is closed', () => {
    const { input, onChange } = setup();

    key(input, 'Enter');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should ignore Enter when nothing matches', () => {
    const { input, onChange } = setup();
    type(input, 'zzzz');

    key(input, 'Enter');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should close the list with Escape and restore the name with a second Escape', () => {
    const { input } = setup();
    type(input, 'arg');

    key(input, 'Escape');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('arg');

    key(input, 'Escape');
    expect(input).toHaveValue('World');
  });

  it('should close on Tab keeping the current selection', () => {
    const { input, onChange } = setup();
    type(input, 'arg');

    key(input, 'Tab');

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('World');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should restore the selected name on blur', () => {
    const { input } = setup();
    type(input, 'arg');

    fireEvent.blur(input);

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('World');
  });

  it('should ignore other keys', () => {
    const { input } = setup();

    key(input, 'a');

    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('should not move when navigating an empty result list', () => {
    const { input } = setup();
    type(input, 'zzzz');

    key(input, 'ArrowDown');
    key(input, 'ArrowUp');
    key(input, 'Home');
    key(input, 'End');

    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('should open an empty-result list without an active option', () => {
    const { input } = setup();
    type(input, 'zzzz');
    key(input, 'Escape');

    key(input, 'ArrowDown');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });
});

describe('CountryCombobox — pointer and clear button', () => {
  it('should select an option on click', () => {
    const { input, onChange } = setup();
    key(input, 'ArrowDown');

    fireEvent.click(screen.getByRole('option', { name: /Brazil/ }));

    expect(onChange).toHaveBeenCalledWith('BRA');
  });

  it('should keep focus in the input when pressing an option', () => {
    const { input } = setup();
    key(input, 'ArrowDown');

    const notPrevented = fireEvent.mouseDown(screen.getAllByRole('option')[1]);

    expect(notPrevented).toBe(false);
  });

  it('should empty the query, list everything and keep focus when clearing', () => {
    const { input } = setup();
    input.focus();
    type(input, 'arg');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(input).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(input).toHaveFocus();
  });

  it('should keep focus in the input when pressing the clear button', () => {
    setup();

    const notPrevented = fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear search' }));

    expect(notPrevented).toBe(false);
  });

  it('should hide the clear button when the input is empty', () => {
    const { input } = setup();

    type(input, '');

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('should mark the chosen option with a check and its row accessible name', () => {
    const { input } = setup('BRA');
    key(input, 'ArrowDown');

    const chosen = screen.getByRole('option', { name: /Brazil/ });

    expect(chosen.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Argentina/ }).querySelector('svg')).toBeNull();
  });

  it('should show the selection made by the parent', () => {
    function Harness() {
      const [value, setValue] = useState('OWID_WRL');
      return (
        <CountryCombobox label="Country" options={OPTIONS} value={value} onChange={setValue} />
      );
    }
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Country' });
    type(input, 'bra');

    key(input, 'Enter');

    expect(input).toHaveValue('Brazil');
  });
});

describe('CountryCombobox — presentation', () => {
  it('should size touch targets and font for mobile', () => {
    const { input } = setup();
    key(input, 'ArrowDown');

    expect(input).toHaveClass('min-h-11', 'text-base');
    expect(screen.getAllByRole('option')[0]).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveClass('min-h-11');
    expect(screen.getByRole('listbox')).toHaveClass('max-h-60', 'overflow-y-auto');
  });

  it('should use the repository focus ring on the input', () => {
    const { input } = setup();

    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-focus-ring');
  });

  it('should render a flag for countries and a globe for World, never emoji', () => {
    const { input, container } = setup();
    key(input, 'ArrowDown');

    const argentina = screen.getByRole('option', { name: /Argentina/ });
    expect(argentina.querySelector('.fi.fi-ar')).toHaveAttribute('aria-hidden', 'true');
    const world = screen.getByRole('option', { name: /World/ });
    expect(world.querySelector('svg')).toBeInTheDocument();
    expect(world.querySelector('[class*="fi-"]')).toBeNull();
    expect(container.textContent).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });

  it('should render the Kosovo flag with its user-assigned code', () => {
    const { input } = setup();
    key(input, 'ArrowDown');

    expect(
      screen.getByRole('option', { name: /Kosovo/ }).querySelector('.fi-xk'),
    ).toBeInTheDocument();
  });
});

describe('CountryCombobox — lazy flags', () => {
  const originalObserver = global.IntersectionObserver;

  afterEach(() => {
    global.IntersectionObserver = originalObserver;
  });

  it('should render flags only for rows that intersect the listbox viewport', () => {
    const observed: Element[] = [];
    const callbacks: IntersectionObserverCallback[] = [];
    global.IntersectionObserver = class implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe(element: Element) {
        observed.push(element);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };

    const { input } = setup('ARG');
    key(input, 'ArrowDown');

    // Selected flag in the input is always rendered; list rows start as placeholders.
    expect(document.querySelectorAll('.fi')).toHaveLength(1);

    // Report the first two flag placeholders as visible.
    act(() => {
      callbacks
        .slice(0, 2)
        .forEach((callback, index) =>
          callback(
            [{ isIntersecting: true, target: observed[index] } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          ),
        );
    });

    expect(document.querySelectorAll('.fi').length).toBeGreaterThan(1);
    expect(document.querySelectorAll('.fi').length).toBeLessThan(OPTIONS.length);
  });
});
