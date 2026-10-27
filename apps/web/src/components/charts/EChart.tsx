'use client';

import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { useEffect, useRef } from 'react';

import { buildChartTheme, createCanvasColorResolver, type ColorResolver } from './chartTheme';
import type { ChartPalette } from './chartTokens';
import { echarts } from './echartsSetup';

interface EChartProps {
  option: EChartsCoreOption;
  /** Classes of the container; it must define the chart height (e.g. `h-72 sm:h-96`). */
  className?: string;
  /** Fixed size for environments that cannot measure the container (unit tests). */
  initSize?: { width: number; height: number };
  /** Series colours (read at mount; changing it later is not supported). Categorical by default. */
  palette?: ChartPalette;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The only place that creates ECharts instances. It owns the SVG-rendered
 * instance, keeps it sized, themed from the design tokens (re-applied when the
 * `dark` class on `<html>` changes) and disposed. It knows nothing about any
 * particular chart: the option arrives as a prop.
 */
export function EChart({ option, className, initSize, palette = 'categorical' }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const resolverRef = useRef<ColorResolver | null>(null);
  const optionRef = useRef(option);
  const paletteRef = useRef(palette);
  const isFirstOptionRun = useRef(true);

  const applyTheme = (chart: EChartsType): void => {
    resolverRef.current ??= createCanvasColorResolver();
    chart.setTheme(buildChartTheme(resolverRef.current, paletteRef.current));
  };

  const applyOption = (chart: EChartsType): void => {
    chart.setOption({ ...optionRef.current, animation: !prefersReducedMotion() });
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const chart = echarts.init(element, undefined, { renderer: 'svg', ...initSize });
    chartRef.current = chart;
    applyOption(chart);
    // setTheme is a no-op until the chart holds an option, so it always comes second.
    applyTheme(chart);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(element);

    const themeObserver = new MutationObserver(() => applyTheme(chart));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // The instance lives as long as the component; option updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    optionRef.current = option;
    // The mount effect already applied the first option and the theme.
    if (isFirstOptionRun.current) {
      isFirstOptionRun.current = false;
      return;
    }
    if (chartRef.current) {
      applyOption(chartRef.current);
    }
  }, [option]);

  return <div ref={containerRef} className={className} data-testid="echart" />;
}
