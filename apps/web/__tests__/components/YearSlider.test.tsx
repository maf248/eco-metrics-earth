import { fireEvent, render, screen } from '@testing-library/react';

import { YearSlider } from '@/components/YearSlider';

describe('YearSlider', () => {
  function renderSlider(min: number, max: number, value = max, onChange = jest.fn()) {
    render(<YearSlider min={min} max={max} value={value} onChange={onChange} label="Year" />);
    return onChange;
  }

  it('should be a named range input over the given years', () => {
    renderSlider(1950, 2024, 2000);
    const slider = screen.getByRole('slider', { name: 'Year' });
    expect(slider).toHaveAttribute('min', '1950');
    expect(slider).toHaveAttribute('max', '2024');
    expect(slider).toHaveValue('2000');
  });

  it('should show the selected year in the bubble', () => {
    renderSlider(1950, 2024, 1987);
    expect(screen.getByTestId('year-slider-value')).toHaveTextContent('1987');
  });

  it('should report the chosen year as a number', () => {
    const onChange = renderSlider(1950, 2024);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1999' } });
    expect(onChange).toHaveBeenCalledWith(1999);
  });

  it.each([
    [1950, 2024, ['1950', '1980', '2000', '2024']],
    [1750, 2024, ['1750', '1800', '1850', '1900', '1950', '2024']],
    [2000, 2024, ['2000', '2010', '2020', '2024']],
  ])('should label %i–%i only where labels cannot collide', (min, max, labels) => {
    renderSlider(min, max);
    const scale = screen.getByTestId('year-slider-value').parentElement?.lastElementChild;
    const shown = [...(scale?.children ?? [])]
      .map((tick) => tick.textContent)
      .filter((text) => text !== '');
    expect(shown).toEqual(labels);
  });
});
