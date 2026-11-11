import { render, screen } from '@testing-library/react';

import { CategoryHeader } from '@/components/CategoryHeader';

describe('CategoryHeader', () => {
  it('should render the title of a category with live data and no placeholder text', () => {
    render(<CategoryHeader category="co2-emissions" />);

    expect(screen.getByRole('heading', { level: 1, name: 'CO2 Emissions' })).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument();
  });

  it('should render the placeholder text of a category without live data', () => {
    render(<CategoryHeader category="ocean-health" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Ocean Health' })).toBeInTheDocument();
    expect(screen.getByText('Ocean Health metrics — coming soon.')).toBeInTheDocument();
  });

  it('should show the title in the brand style, static and with no cursor', () => {
    render(<CategoryHeader category="co2-emissions" />);
    const title = screen.getByRole('heading', { level: 1 });

    expect(title).toHaveClass('font-mono', 'text-accent', 'text-4xl');
    expect(title).toHaveTextContent(/^CO2 Emissions$/);
    expect(title.querySelector('.typewriter-char, .typewriter-cursor')).toBeNull();
  });
});
