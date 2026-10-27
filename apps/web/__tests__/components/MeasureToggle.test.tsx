import { fireEvent, render, screen } from '@testing-library/react';

import { MeasureToggle } from '@/components/MeasureToggle';

type Option = 'first' | 'second';

const OPTIONS: { value: Option; label: string }[] = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
];

describe('MeasureToggle', () => {
  it('should render a radio group named by its legend with the first option checked', () => {
    render(<MeasureToggle legend="Measure" options={OPTIONS} value="first" onChange={jest.fn()} />);

    expect(screen.getByRole('group', { name: 'Measure' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'First' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Second' })).not.toBeChecked();
  });

  it('should call back with the selected value and keep no state of its own', () => {
    const onChange = jest.fn();
    render(<MeasureToggle legend="Measure" options={OPTIONS} value="first" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Second' }));

    expect(onChange).toHaveBeenCalledWith('second');
    expect(screen.getByRole('radio', { name: 'First' })).toBeChecked();
  });

  it('should use native radios so the arrow keys move the selection, with a visible focus ring', () => {
    render(<MeasureToggle legend="Measure" options={OPTIONS} value="first" onChange={jest.fn()} />);

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('type', 'radio');
      expect(radio).toHaveClass('peer', 'sr-only');
    }
    expect(screen.getByText('First')).toHaveClass(
      'peer-focus-visible:ring-2',
      'peer-focus-visible:ring-focus-ring',
    );
  });

  it('should share one name across the radios and give each a label of at least 44px', () => {
    render(<MeasureToggle legend="Measure" options={OPTIONS} value="first" onChange={jest.fn()} />);

    const names = screen.getAllByRole('radio').map((radio) => radio.getAttribute('name'));
    expect(new Set(names).size).toBe(1);
    expect(screen.getByText('First')).toHaveClass('min-h-11', 'text-base');
  });
});
