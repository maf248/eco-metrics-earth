import { render, screen, within } from '@testing-library/react';

import { OceanSection } from '@/components/ocean-health/OceanSection';
import type { SectionState } from '@/components/ProviderBackedContent';

import { OWID_OCEAN_META } from '../../fixtures/oceanHealth';

type Payload = { meta: typeof OWID_OCEAN_META };
const payload: Payload = { meta: OWID_OCEAN_META };

const Body = () => <p data-testid="body">the section body</p>;

function renderSection(state: SectionState<Payload>) {
  return render(
    <OceanSection headingId="the-heading" title="A section" state={state} Body={Body} />,
  );
}

describe('OceanSection', () => {
  it('should render nothing, heading included, when its read failed', () => {
    const { container } = renderSection({ kind: 'failed' });

    expect(container).toBeEmptyDOMElement();
  });

  it('should be a region named by its own h2, holding the body when the data is fresh', () => {
    renderSection({ kind: 'fresh', payload });

    const region = screen.getByRole('region', { name: 'A section' });
    expect(within(region).getByRole('heading', { level: 2, name: 'A section' })).toHaveAttribute(
      'id',
      'the-heading',
    );
    expect(within(region).getByTestId('body')).toBeInTheDocument();
    expect(screen.queryByTestId('stale-data-notice')).not.toBeInTheDocument();
  });

  it('should show the stale notice, then the body, under the heading', () => {
    renderSection({
      kind: 'stale-notice',
      payload,
      providerName: 'Our World in Data',
      fetchedAt: '2026-11-10T00:00:00.000Z',
    });

    const region = screen.getByRole('region', { name: 'A section' });
    const notice = within(region).getByTestId('stale-data-notice');
    expect(notice).toHaveTextContent('Our World in Data is currently unreachable');
    expect(
      notice.compareDocumentPosition(within(region).getByTestId('body')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('should keep the heading and replace the body with the unavailable state naming the provider', () => {
    renderSection({ kind: 'unavailable', providerName: 'NOAA Laboratory for Satellite Altimetry' });

    const region = screen.getByRole('region', { name: 'A section' });
    expect(
      within(region).getByRole('heading', { level: 2, name: 'A section' }),
    ).toBeInTheDocument();
    expect(within(region).getByTestId('data-unavailable')).toHaveTextContent(
      'NOAA Laboratory for Satellite Altimetry',
    );
    expect(within(region).queryByTestId('body')).not.toBeInTheDocument();
  });

  it('should keep the attribution of a payload that is too old to show', () => {
    renderSection({
      kind: 'unavailable',
      providerName: 'Our World in Data',
      payload,
      fetchedAt: '2026-09-01T00:00:00.000Z',
    });

    expect(screen.getByTestId('unavailable-data-attribution')).toBeInTheDocument();
    expect(screen.getByTestId('data-unavailable')).toHaveTextContent('Last retrieved');
  });
});
