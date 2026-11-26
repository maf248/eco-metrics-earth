import { render, screen, within } from '@testing-library/react';

import { OceanKeyFigures } from '@/components/ocean-health/OceanKeyFigures';
import type { OceanHealthSections } from '@/lib/oceanHealthStructuredData';

import {
  COPERNICUS_META,
  NOAA_LSA_META,
  OCEAN_PH_FIXTURE,
  OCEAN_SEA_LEVEL_FIXTURE,
  OCEAN_SST_ANOMALY_FIXTURE,
  OCEAN_SST_DAILY_FIXTURE,
  OWID_OCEAN_META,
} from '../../fixtures/oceanHealth';

const ALL: OceanHealthSections = {
  sst: { data: OCEAN_SST_DAILY_FIXTURE, meta: COPERNICUS_META },
  anomaly: { data: OCEAN_SST_ANOMALY_FIXTURE, meta: OWID_OCEAN_META },
  seaLevel: { data: OCEAN_SEA_LEVEL_FIXTURE, meta: NOAA_LSA_META },
  ph: { data: OCEAN_PH_FIXTURE, meta: OWID_OCEAN_META },
};

// Non-breaking spaces between a value and its unit read as spaces in these assertions.
const text = (testId: string): string =>
  (screen.getByTestId(testId).textContent ?? '').replace(/\u00a0/g, ' ');

describe('OceanKeyFigures', () => {
  it('should list the four figures in order, each in its own list item', () => {
    render(<OceanKeyFigures sections={ALL} />);

    const panel = screen.getByRole('region', { name: 'Key figures' });
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.dataset.testid),
    ).toEqual([
      'ocean-key-figure-sst',
      'ocean-key-figure-warming',
      'ocean-key-figure-sea-level',
      'ocean-key-figure-acidity',
    ]);
  });

  it('should state the latest daily value, its anomaly, date, coverage and the record', () => {
    render(<OceanKeyFigures sections={ALL} />);

    const sst = text('ocean-key-figure-sst');
    expect(sst).toContain('20.88 °C');
    expect(sst).toContain(
      '+0.76 °C vs the 1991–2020 average, ocean between 60°S–60°N, on 9 Apr 2024',
    );
    expect(sst).toContain('Daily record since 2022: 21.11 °C on 24 Aug 2023');
    expect(sst).toContain('Source: Copernicus Climate Pulse');
    expect(sst).not.toMatch(/today|preliminary/i);
    expect(
      within(screen.getByTestId('ocean-key-figure-sst')).getByText('9 Apr 2024'),
    ).toHaveAttribute('dateTime', '2024-04-09');
  });

  it('should flag a preliminary value and use the real minus sign', () => {
    const latest = {
      ...OCEAN_SST_DAILY_FIXTURE.latest,
      anomaly: -0.154,
      status: 'preliminary' as const,
    };
    render(
      <OceanKeyFigures
        sections={{ sst: { data: { ...OCEAN_SST_DAILY_FIXTURE, latest }, meta: COPERNICUS_META } }}
      />,
    );

    expect(text('ocean-key-figure-sst')).toContain('−0.15 °C');
    expect(text('ocean-key-figure-sst')).toContain('preliminary value');
  });

  it('should say the latest day is the daily record when it is', () => {
    const { latest } = OCEAN_SST_DAILY_FIXTURE;
    render(
      <OceanKeyFigures
        sections={{
          sst: { data: { ...OCEAN_SST_DAILY_FIXTURE, record: latest }, meta: COPERNICUS_META },
        }}
      />,
    );

    expect(text('ocean-key-figure-sst')).toContain('This is the daily record since 2022.');
  });

  it('should state the ocean warming, the sea level rise and the acidity with their sources', () => {
    render(<OceanKeyFigures sections={ALL} />);

    const warming = text('ocean-key-figure-warming');
    expect(warming).toContain('+1.20 °C');
    expect(warming).toContain('World sea surface temperature in 2024, vs the 1861–1890 average');
    expect(warming).toContain('The warmest year since 2020.');
    expect(warming).toContain('Source: Met Office Hadley Centre, via Our World in Data');

    const seaLevel = text('ocean-key-figure-sea-level');
    expect(seaLevel).toContain('+12 cm');
    expect(seaLevel).toContain('Global mean sea level, Dec 1992 to Feb 2025');
    expect(seaLevel).toContain('Trend: 3.11 mm/year');
    expect(seaLevel).toContain('Source: NOAA Laboratory for Satellite Altimetry');
    expect(seaLevel).not.toContain('via');

    const acidity = text('ocean-key-figure-acidity');
    expect(acidity).toContain('+18%');
    expect(acidity).toContain('More acidic at Hawaii, 1990–2024');
    expect(acidity).toContain('pH fell from 8.11 to 8.04 (yearly averages)');
    expect(acidity).toContain('Source: Hawaii Ocean Time-series, via Our World in Data');
  });

  it('should name a warmest year other than the latest one', () => {
    const [world, ...rest] = OCEAN_SST_ANOMALY_FIXTURE.regions;
    const data = {
      ...OCEAN_SST_ANOMALY_FIXTURE,
      regions: [{ ...world, mean: [0.8, 0.85, 1.21, 1.1, 1.096] }, ...rest],
    };
    render(<OceanKeyFigures sections={{ anomaly: { data, meta: OWID_OCEAN_META } }} />);

    expect(text('ocean-key-figure-warming')).toContain('+1.10 °C');
    expect(text('ocean-key-figure-warming')).toContain('Warmest year: 2022 (+1.21 °C)');
  });

  it('should leave out the figure of a section without data', () => {
    render(<OceanKeyFigures sections={{ ...ALL, seaLevel: undefined }} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByTestId('ocean-key-figure-sea-level')).not.toBeInTheDocument();
  });

  it('should render nothing when no section has data', () => {
    const { container } = render(<OceanKeyFigures sections={{}} />);

    expect(container).toBeEmptyDOMElement();
  });
});
