import { render, screen, within } from '@testing-library/react';

import {
  DeforestationContent,
  type DeforestationPayloads,
} from '@/components/deforestation/DeforestationContent';
import type { SectionStates } from '@/lib/categoryPages';

import { FOREST_PAYLOAD, TREE_COVER_LOSS_PAYLOAD } from '../../fixtures/deforestation';

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: () => <div data-testid="line-chart-stub" />,
}));
jest.mock('@/components/charts/LazyColumnEChart', () => ({
  LazyColumnEChart: () => <div data-testid="column-chart-stub" />,
}));
jest.mock('@/components/charts/ChoroplethMap', () => ({
  ChoroplethMap: () => <div data-testid="map-stub" />,
}));

type States = SectionStates<DeforestationPayloads>;

const FRESH: States = {
  forestArea: { kind: 'fresh', payload: FOREST_PAYLOAD },
  treeCoverLoss: { kind: 'fresh', payload: TREE_COVER_LOSS_PAYLOAD },
};

const UNAVAILABLE = { kind: 'unavailable', providerName: 'Our World in Data' } as const;

function jsonLdBlocks(container: HTMLElement): Element[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')];
}

describe('DeforestationContent', () => {
  it('should render the intro, the key figures, three headed cards and the methodology in order', () => {
    const { container } = render(<DeforestationContent states={FRESH} />);

    const intro = screen.getByText('How much forest is the world losing, where, and why?');
    const figures = screen.getByTestId('forest-key-figures');
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    const methodology = screen.getByTestId('deforestation-methodology');

    expect(headings).toEqual([
      'Forest area',
      'Forest change since 1990',
      'Tree cover loss by cause',
    ]);
    for (const [before, after] of [
      [intro, figures],
      [figures, screen.getByRole('heading', { name: 'Forest area' })],
      [screen.getByRole('heading', { name: 'Tree cover loss by cause' }), methodology],
    ]) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(container.querySelectorAll('main')).toHaveLength(0);
  });

  it('should read the agreed key figures sentence from the World values', () => {
    render(<DeforestationContent states={FRESH} />);

    expect(screen.getByTestId('forest-key-figures')).toHaveTextContent(
      "Since 1990 the world has lost a net 203 million hectares of forest, an area the size of Mexico. Forests now cover 31.9% of the world's land.",
    );
  });

  it('should credit FAO next to the forest explorer and Global Forest Watch next to the causes', () => {
    render(<DeforestationContent states={FRESH} />);

    const forest = screen.getByTestId('forest-area-attribution');
    const causes = screen.getByTestId('tree-cover-loss-attribution');
    expect(within(forest).getByTestId('forest-area-origin')).toHaveTextContent(
      'Global Forest Resources Assessment 2025',
    );
    expect(within(causes).getByTestId('tree-cover-loss-origin')).toHaveTextContent(
      'Tree cover loss by dominant driver',
    );
    expect(forest).toHaveTextContent('Our World in Data');
    expect(causes).toHaveTextContent('CC BY 4.0');
  });

  it('should render one Dataset JSON-LD with both sections', () => {
    const { container } = render(<DeforestationContent states={FRESH} />);

    const blocks = jsonLdBlocks(container);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].textContent).toContain('Tree cover loss by dominant driver');
  });

  it('should keep the forest sections and show the unavailable state only in the cause card', () => {
    render(<DeforestationContent states={{ ...FRESH, treeCoverLoss: UNAVAILABLE }} />);

    expect(screen.getByTestId('forest-key-figures')).toBeInTheDocument();
    expect(screen.getByTestId('map-stub')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Tree cover loss by cause' });
    expect(within(region).getByTestId('data-unavailable')).toHaveTextContent('Our World in Data');
    expect(screen.queryByTestId('column-chart-stub')).not.toBeInTheDocument();
    expect(screen.getByTestId('deforestation-methodology')).toBeInTheDocument();
  });

  it('should replace the key figures, explorer, map and ranking with one unavailable state under "Forest area"', () => {
    const { container } = render(
      <DeforestationContent states={{ ...FRESH, forestArea: UNAVAILABLE }} />,
    );

    expect(screen.queryByTestId('forest-key-figures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-stub')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Forest change since 1990' }),
    ).not.toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Forest area' });
    expect(within(region).getAllByTestId('data-unavailable')).toHaveLength(1);
    expect(screen.getAllByTestId('data-unavailable')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Tree cover loss by cause' })).toBeInTheDocument();
    // Only the cause section is present: no forest variable in the structured data.
    expect(jsonLdBlocks(container)[0].textContent).not.toContain('Forest area as a share');
  });

  it('should show one stale notice above the explorer for an aged forest area payload', () => {
    render(
      <DeforestationContent
        states={{
          ...FRESH,
          forestArea: {
            kind: 'stale-notice',
            payload: FOREST_PAYLOAD,
            providerName: 'Our World in Data',
            fetchedAt: '2026-11-16T00:00:00.000Z',
          },
        }}
      />,
    );

    const notice = screen.getByTestId('stale-data-notice');
    expect(screen.getAllByTestId('stale-data-notice')).toHaveLength(1);
    expect(notice).toHaveTextContent('Our World in Data is currently unreachable');
    expect(
      notice.compareDocumentPosition(screen.getByRole('region', { name: 'Forest area' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId('forest-key-figures')).toBeInTheDocument();
  });

  it('should keep the methodology and render no JSON-LD when both sections are unavailable', () => {
    const { container } = render(
      <DeforestationContent states={{ forestArea: UNAVAILABLE, treeCoverLoss: UNAVAILABLE }} />,
    );

    expect(jsonLdBlocks(container)).toHaveLength(0);
    expect(screen.getAllByTestId('data-unavailable')).toHaveLength(2);
    expect(screen.getByTestId('deforestation-methodology')).toHaveTextContent(
      'The two measure different things, so they cannot be compared or added together.',
    );
  });

  it('should name no sum or comparison of the two sources and say tree cover loss is not deforestation', () => {
    const { container } = render(<DeforestationContent states={FRESH} />);
    const visible = container.cloneNode(true) as HTMLElement;
    visible.querySelectorAll('script').forEach((script) => script.remove());
    const text = visible.textContent ?? '';

    expect(text.match(/deforestation/gi)).toHaveLength(1);
    expect(text).toContain('It is not the same as deforestation');
  });
});
