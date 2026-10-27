import { readFileSync } from 'fs';
import { join } from 'path';

import { render, screen, waitFor } from '@testing-library/react';

import { EChart } from '../../../src/components/charts/EPieChart';
import { buildEnergyAreaOption, buildEnergyDonutOption } from '../../../src/lib/energyChartOption';
import { ENERGY_FIXTURE, energyEntity } from '../../fixtures/energySources';

import { clearTokens, declareTokens, stubCanvasContext } from './canvasStub';

const SRC = join(__dirname, '..', '..', '..', 'src', 'components', 'charts');

const DONUT = {
  series: [
    {
      type: 'pie',
      radius: ['45%', '72%'],
      label: { show: false },
      data: [
        { name: 'Coal', value: 60 },
        { name: 'Gas', value: 40 },
      ],
    },
  ],
};

describe('pie chart entry', () => {
  let getContextSpy: jest.SpyInstance;

  beforeEach(() => {
    getContextSpy = stubCanvasContext();
    declareTokens();
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    clearTokens();
  });

  it('should render the slice paths in an SVG with an explicit size', async () => {
    const { container } = render(
      <EChart option={DONUT} palette="energyMix" initSize={{ width: 400, height: 300 }} />,
    );

    await waitFor(() => expect(container.querySelectorAll('svg path').length).toBeGreaterThan(1));
    expect(container.innerHTML).toContain('rgb(37,41,51)');
    expect(container.innerHTML).toContain('rgb(202,172,124)');
  });

  it('should render a donut with null items without error, as a slice-less source', async () => {
    const option = buildEnergyDonutOption(energyEntity('BIH'), 2025, 2023);
    const { container } = render(
      <EChart option={option} palette="energyMix" initSize={{ width: 400, height: 300 }} />,
    );

    await waitFor(() => expect(container.querySelectorAll('svg path').length).toBeGreaterThan(1));
    expect(container.querySelector('svg')?.outerHTML).not.toContain('NaN');
    const label = screen.getByTestId('echart').getAttribute('aria-label');
    expect(label).toContain('Bosnia and Herzegovina: electricity mix in 2025.');
    expect(label).not.toContain('NaN');
  });

  it('should render a stacked area with null values without error', async () => {
    // The shared base grid uses `containLabel`, which ECharts logs as deprecated; this test is
    // about stacking nulls, so the grid is left to the defaults.
    const option = {
      ...buildEnergyAreaOption(energyEntity('BIH'), 'share', ENERGY_FIXTURE),
      grid: undefined,
    };
    const { container } = render(
      <EChart option={option} palette="energyMix" initSize={{ width: 400, height: 300 }} />,
    );

    await waitFor(() => expect(container.querySelectorAll('svg path').length).toBeGreaterThan(1));
    expect(container.querySelector('svg')?.outerHTML).not.toContain('NaN');
    const label = screen.getByTestId('echart').getAttribute('aria-label');
    expect(label).toContain('electricity share by source, 2023 to 2025');
    expect(label).not.toContain('NaN');
  });

  it('should register the pie in its own entry and not in the cartesian setup', () => {
    const setup = readFileSync(join(SRC, 'echartsSetup.ts'), 'utf8');
    const entry = readFileSync(join(SRC, 'EPieChart.tsx'), 'utf8');
    const lazyCartesian = readFileSync(join(SRC, 'LazyEChart.tsx'), 'utf8');

    expect(setup).not.toContain('PieChart');
    expect(lazyCartesian).not.toContain('PieChart');
    expect(lazyCartesian).not.toContain('EPieChart');
    expect(entry).toContain('echarts.use([PieChart])');
  });
});
