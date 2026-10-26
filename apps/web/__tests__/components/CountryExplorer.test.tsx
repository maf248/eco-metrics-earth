import { fireEvent, render, screen } from '@testing-library/react';

import { CountryExplorer } from '@/components/CountryExplorer';

const entities = [
  { code: 'OWID_WRL', iso2: null, name: 'World' },
  { code: 'ARG', iso2: 'AR', name: 'Argentina' },
  { code: 'USA', iso2: 'US', name: 'United States' },
];

function renderExplorer(list = entities, controls?: React.ReactNode) {
  const seen: string[] = [];
  render(
    <CountryExplorer heading="Explore things" entities={list} controls={controls}>
      {(entity) => {
        seen.push(entity.code);
        return <p data-testid="selected">{entity.name}</p>;
      }}
    </CountryExplorer>,
  );
  return seen;
}

describe('CountryExplorer', () => {
  it('should label the card by its heading and default to World', () => {
    const seen = renderExplorer();

    expect(screen.getByRole('region', { name: 'Explore things' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Explore things' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
    expect(screen.getByTestId('selected')).toHaveTextContent('World');
    expect(seen[0]).toBe('OWID_WRL');
  });

  it('should fall back to the first entity when World is absent', () => {
    renderExplorer(entities.slice(1));

    expect(screen.getByTestId('selected')).toHaveTextContent('Argentina');
  });

  it('should render the selected entity after the user picks another country', () => {
    renderExplorer();
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('selected')).toHaveTextContent('Argentina');
  });

  it('should render the controls slot on the same row as the combobox', () => {
    renderExplorer(entities, <div data-testid="controls">toggle</div>);

    const row = screen.getByTestId('controls').parentElement;
    expect(row).toContainElement(screen.getByRole('combobox', { name: 'Country' }));
  });

  it('should not fetch or touch the URL, history or storage on interaction', () => {
    const fetchSpy = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchSpy as unknown as typeof global.fetch;
    const pushState = jest.spyOn(window.history, 'pushState');
    const replaceState = jest.spyOn(window.history, 'replaceState');
    renderExplorer();
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });
});
