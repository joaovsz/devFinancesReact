import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { LineChart, PieChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components"

echarts.use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

export { echarts }
