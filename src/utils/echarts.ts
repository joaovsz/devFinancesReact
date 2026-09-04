import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { BarChart, LineChart, PieChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components"

echarts.use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
])

export { echarts }
