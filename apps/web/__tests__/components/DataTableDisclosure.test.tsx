import { fireEvent, render, screen } from '@testing-library/react';

import { DataTableDisclosure } from '@/components/DataTableDisclosure';

describe('DataTableDisclosure', () => {
  it('should be a closed disclosure named "View data table" with its content inside', () => {
    const { container } = render(
      <DataTableDisclosure>
        <p>table</p>
      </DataTableDisclosure>,
    );

    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('View data table')).toBeInTheDocument();
    expect(details).toHaveTextContent('table');
  });

  it('should add the screen-reader label only when given', () => {
    const { container, rerender } = render(<DataTableDisclosure>x</DataTableDisclosure>);
    expect(container.querySelector('.sr-only')).toBeNull();

    rerender(<DataTableDisclosure srLabel="countries ranked">x</DataTableDisclosure>);
    expect(container.querySelector('.sr-only')).toHaveTextContent(': countries ranked');
  });

  it('should report when it opens', () => {
    const onToggle = jest.fn();
    const { container } = render(<DataTableDisclosure onToggle={onToggle}>x</DataTableDisclosure>);

    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new Event('toggle'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
