import { render, screen } from '@testing-library/react';

import { SocialCard } from '@/lib/socialCard';

const card = (bodyFontSize?: number) =>
  SocialCard({
    icon: <svg data-testid="card-icon" />,
    heading: 'Heading',
    body: 'Body text',
    accent: 'Accent line',
    bodyFontSize,
  });

describe('SocialCard', () => {
  it('should draw the icon, then the heading, body and accent lines', () => {
    render(card());

    expect(screen.getByTestId('card-icon')).toBeInTheDocument();
    expect(screen.getByText('Heading')).toHaveStyle({ fontSize: '68px' });
    expect(screen.getByText('Accent line')).toHaveStyle({ fontSize: '30px' });
  });

  it('should default the body to the site tagline size', () => {
    render(card());

    expect(screen.getByText('Body text')).toHaveStyle({ fontSize: '34px' });
  });

  it('should take a smaller body size for longer text', () => {
    render(card(30));

    expect(screen.getByText('Body text')).toHaveStyle({ fontSize: '30px' });
  });
});
