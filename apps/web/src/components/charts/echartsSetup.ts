import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

// Tree-shaken registration: only what every chart page needs, reference lines included.
// Heavier features (map, visualMap) register in the component that uses them. Never the
// canvas renderer.
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  MarkLineComponent,
  SVGRenderer,
]);

export { echarts };
